-- 整備サイクル設定 MVP: 整備記録の保存と自動予定(サイクル設定連動)の更新を
-- 同一トランザクションで行うためのPostgres関数を追加する。
--
-- SECURITY INVOKER(既定)で定義し、呼び出したユーザーの権限・RLSポリシーを
-- そのまま適用させる(SECURITY DEFINERは使わない。RLSを迂回させないため)。
-- auth.uid() はクライアントから受け取らず、関数内で都度取得する。
-- 所有権はRLSに加えて関数内でも明示的に確認する(二重の防御)。
--
-- 「サイクル設定が選択され、かつ距離間隔・期間間隔の少なくとも一方が
-- 指定された場合のみ」自動予定(maintenance_schedules, cycle_setting_id NOT NULL)を
-- upsertする。どちらも指定されない場合は整備記録のみを保存し、既存の予定には
-- 一切触れない。
--
-- 走行距離は「日々更新される値」ではなく「最後に入力された時点のスナップショット」
-- として扱う。整備記録の走行距離がバイクの現在値以上のときだけ、バイクの
-- current_mileage / mileage_recorded_on を整備日で更新する(WHERE句の比較で
-- 条件を満たさない場合は0行更新となり、古い値で上書きされることはない)。
--
-- 関数はplpgsqlの通常のトランザクションセマンティクスに従うため、途中で
-- 例外(RAISE EXCEPTION)が発生した場合はこの関数呼び出し内の変更(記録の
-- insert/update・予定のupsert・バイクの走行距離更新)がすべて自動的に
-- ロールバックされる。
-- (既存マイグレーションは変更しない)

create or replace function public.create_maintenance_record_with_schedule(
  p_motorcycle_id uuid,
  p_maintenance_date date,
  p_category text,
  p_mileage integer,
  p_cost integer,
  p_note text,
  p_cycle_setting_id uuid,
  p_item_name text,
  p_distance_interval_km integer,
  p_period_interval_months integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_record_id uuid;
  v_next_due_mileage integer;
  v_next_due_date date;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not exists (
    select 1 from public.motorcycles
    where id = p_motorcycle_id and user_id = v_user_id
  ) then
    raise exception 'MOTORCYCLE_NOT_FOUND';
  end if;

  if p_cycle_setting_id is not null and not exists (
    select 1 from public.maintenance_cycle_settings
    where id = p_cycle_setting_id
      and user_id = v_user_id
      and motorcycle_id = p_motorcycle_id
  ) then
    raise exception 'CYCLE_SETTING_NOT_FOUND';
  end if;

  insert into public.maintenance_records (
    user_id, motorcycle_id, maintenance_date, category, mileage, cost, note,
    cycle_setting_id, item_name, distance_interval_km, period_interval_months
  ) values (
    v_user_id, p_motorcycle_id, p_maintenance_date, p_category, p_mileage, p_cost, p_note,
    p_cycle_setting_id, p_item_name, p_distance_interval_km, p_period_interval_months
  )
  returning id into v_record_id;

  -- バイクの現在走行距離は、今回の記録の走行距離が現在値以上のときだけ進める。
  -- WHERE句の比較自体が「小さい値では上書きしない」を保証するため、
  -- 事前のSELECT比較は不要(1文で完結し競合状態も生じない)。
  if p_mileage is not null then
    update public.motorcycles
    set current_mileage = p_mileage,
        mileage_recorded_on = p_maintenance_date
    where id = p_motorcycle_id
      and user_id = v_user_id
      and current_mileage <= p_mileage;
  end if;

  if p_cycle_setting_id is not null
     and (p_distance_interval_km is not null or p_period_interval_months is not null) then

    if p_distance_interval_km is not null then
      if p_mileage is null then
        raise exception 'MILEAGE_REQUIRED_FOR_DISTANCE_INTERVAL';
      end if;
      v_next_due_mileage := p_mileage + p_distance_interval_km;
    else
      v_next_due_mileage := null;
    end if;

    if p_period_interval_months is not null then
      v_next_due_date := (p_maintenance_date + make_interval(months => p_period_interval_months))::date;
    else
      v_next_due_date := null;
    end if;

    insert into public.maintenance_schedules (
      user_id, motorcycle_id, cycle_setting_id, item_name, category,
      next_due_date, next_due_mileage, distance_interval_km
    ) values (
      v_user_id, p_motorcycle_id, p_cycle_setting_id, p_item_name, p_category,
      v_next_due_date, v_next_due_mileage, p_distance_interval_km
    )
    on conflict (cycle_setting_id) do update set
      item_name = excluded.item_name,
      category = excluded.category,
      next_due_date = excluded.next_due_date,
      next_due_mileage = excluded.next_due_mileage,
      distance_interval_km = excluded.distance_interval_km,
      updated_at = now();
  end if;

  return v_record_id;
end;
$$;

create or replace function public.update_maintenance_record_with_schedule(
  p_record_id uuid,
  p_maintenance_date date,
  p_category text,
  p_mileage integer,
  p_cost integer,
  p_note text,
  p_cycle_setting_id uuid,
  p_item_name text,
  p_distance_interval_km integer,
  p_period_interval_months integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_motorcycle_id uuid;
  v_next_due_mileage integer;
  v_next_due_date date;
  v_updated_id uuid;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 所有権確認(1): 整備記録自体が本人のものか(同時にmotorcycle_idを取得)
  select motorcycle_id into v_motorcycle_id
  from public.maintenance_records
  where id = p_record_id and user_id = v_user_id;

  if v_motorcycle_id is null then
    raise exception 'RECORD_NOT_FOUND';
  end if;

  -- 所有権確認(2): 紐づくバイクも本人所有か
  if not exists (
    select 1 from public.motorcycles
    where id = v_motorcycle_id and user_id = v_user_id
  ) then
    raise exception 'RECORD_NOT_FOUND';
  end if;

  if p_cycle_setting_id is not null and not exists (
    select 1 from public.maintenance_cycle_settings
    where id = p_cycle_setting_id
      and user_id = v_user_id
      and motorcycle_id = v_motorcycle_id
  ) then
    raise exception 'CYCLE_SETTING_NOT_FOUND';
  end if;

  update public.maintenance_records set
    maintenance_date = p_maintenance_date,
    category = p_category,
    mileage = p_mileage,
    cost = p_cost,
    note = p_note,
    cycle_setting_id = p_cycle_setting_id,
    item_name = p_item_name,
    distance_interval_km = p_distance_interval_km,
    period_interval_months = p_period_interval_months
  where id = p_record_id and user_id = v_user_id
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'RECORD_NOT_FOUND';
  end if;

  -- バイクの現在走行距離は、今回の記録の走行距離が現在値以上のときだけ進める。
  if p_mileage is not null then
    update public.motorcycles
    set current_mileage = p_mileage,
        mileage_recorded_on = p_maintenance_date
    where id = v_motorcycle_id
      and user_id = v_user_id
      and current_mileage <= p_mileage;
  end if;

  if p_cycle_setting_id is not null
     and (p_distance_interval_km is not null or p_period_interval_months is not null) then

    if p_distance_interval_km is not null then
      if p_mileage is null then
        raise exception 'MILEAGE_REQUIRED_FOR_DISTANCE_INTERVAL';
      end if;
      v_next_due_mileage := p_mileage + p_distance_interval_km;
    else
      v_next_due_mileage := null;
    end if;

    if p_period_interval_months is not null then
      v_next_due_date := (p_maintenance_date + make_interval(months => p_period_interval_months))::date;
    else
      v_next_due_date := null;
    end if;

    insert into public.maintenance_schedules (
      user_id, motorcycle_id, cycle_setting_id, item_name, category,
      next_due_date, next_due_mileage, distance_interval_km
    ) values (
      v_user_id, v_motorcycle_id, p_cycle_setting_id, p_item_name, p_category,
      v_next_due_date, v_next_due_mileage, p_distance_interval_km
    )
    on conflict (cycle_setting_id) do update set
      item_name = excluded.item_name,
      category = excluded.category,
      next_due_date = excluded.next_due_date,
      next_due_mileage = excluded.next_due_mileage,
      distance_interval_km = excluded.distance_interval_km,
      updated_at = now();
  end if;

  return v_updated_id;
end;
$$;

grant execute on function public.create_maintenance_record_with_schedule(
  uuid, date, text, integer, integer, text, uuid, text, integer, integer
) to authenticated;

grant execute on function public.update_maintenance_record_with_schedule(
  uuid, date, text, integer, integer, text, uuid, text, integer, integer
) to authenticated;
