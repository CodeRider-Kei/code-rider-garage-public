-- 整備期限・次回交換時期管理 MVP: maintenance_schedules テーブルの作成
-- 整備項目ごとの「現在有効な予定」を1件保持する(履歴は持たない)。
--
-- - 同一カテゴリー内の複数項目を許可するため、一意制約は設けない
--   (item_nameで項目を区別する。例: 同じ「チェーン」カテゴリーでも
--   「チェーン清掃」と「チェーン交換」を別の予定として登録できる)。
-- - cycle_setting_id が NULL の行は手動作成の予定、NOT NULLの行は
--   整備サイクル設定(maintenance_cycle_settings)から自動計算された予定。
--   サイクル設定が削除されたら、その自動予定も削除する(ON DELETE CASCADE)。
-- - cycle_setting_id に一意制約を張ることで「サイクル設定ごとに自動予定は
--   最大1件」をDBレベルで保証する。NULL同士は一意制約違反にならないため、
--   手動予定(NULL)は何件でも共存できる。
-- - 予定は距離・日付のどちらか一方だけでも成立する。distance_interval_km は
--   自動予定の期限間近判定(設定間隔の10%以内)に使うスナップショット値であり、
--   後からサイクル設定の間隔を変更しても既存予定の判定基準は変わらない。

create table public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  cycle_setting_id uuid unique references public.maintenance_cycle_settings(id) on delete cascade,
  item_name text not null,
  category text not null,
  next_due_date date,
  next_due_mileage integer,
  distance_interval_km integer,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_schedules_next_due_mileage_positive
    check (next_due_mileage is null or next_due_mileage > 0),
  constraint maintenance_schedules_distance_interval_km_positive
    check (distance_interval_km is null or distance_interval_km > 0),
  constraint maintenance_schedules_due_target_required
    check (next_due_date is not null or next_due_mileage is not null),
  constraint maintenance_schedules_mileage_needs_interval
    check (next_due_mileage is null or distance_interval_km is not null)
);

create index maintenance_schedules_user_id_idx
on public.maintenance_schedules(user_id);

create index maintenance_schedules_motorcycle_id_due_date_idx
on public.maintenance_schedules(motorcycle_id, next_due_date asc);

create index maintenance_schedules_cycle_setting_id_idx
on public.maintenance_schedules(cycle_setting_id);

alter table public.maintenance_schedules enable row level security;

create policy "Users can select own maintenance schedules"
on public.maintenance_schedules
for select to authenticated
using ((select auth.uid()) = user_id);

-- motorcycle_id が自分の所有するバイクであることをRLSレベルでも保証する
-- (Server Action / RPC側でも別途所有権チェックを行うが、二重の防御として設定)
create policy "Users can insert own maintenance schedules"
on public.maintenance_schedules
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.motorcycles
    where motorcycles.id = motorcycle_id
      and motorcycles.user_id = (select auth.uid())
  )
);

grant select, insert on public.maintenance_schedules to authenticated;
