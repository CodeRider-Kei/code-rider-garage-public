-- 整備サイクル設定 MVP: maintenance_records に、整備記録保存時点で使用した
-- サイクル設定の内容をスナップショットとして保持する列を追加する。
-- サイクル設定が後から削除されても記録自体は保持したいため、
-- 参照列(cycle_setting_id)のみを外す(ON DELETE SET NULL)。
-- 項目名・距離間隔・期間間隔の実値は独立した列にスナップショットしているため、
-- 参照が外れても記録の内容(何を・どの間隔で行ったか)は失われない。
-- (既存マイグレーションは変更しない)

alter table public.maintenance_records
  add column cycle_setting_id uuid references public.maintenance_cycle_settings(id) on delete set null,
  add column item_name text,
  add column distance_interval_km integer,
  add column period_interval_months integer;

alter table public.maintenance_records
  add constraint maintenance_records_distance_interval_km_positive
    check (distance_interval_km is null or distance_interval_km > 0),
  add constraint maintenance_records_period_interval_months_positive
    check (period_interval_months is null or period_interval_months > 0),
  add constraint maintenance_records_item_name_length
    check (item_name is null or char_length(item_name) <= 50);

create index maintenance_records_cycle_setting_id_idx
on public.maintenance_records(cycle_setting_id);
