-- 整備サイクル設定 MVP: maintenance_cycle_settings テーブルの作成
-- バイクごとに整備項目(例: エンジンオイル交換)ごとの距離間隔・期間間隔を事前設定できるようにする。
-- 登録・一覧表示に必要な最小限のスキーマとRLSポリシー(SELECT/INSERTのみ)。
-- UPDATE/DELETEポリシーは次のマイグレーションで追加する。
-- 同一カテゴリー内に複数の整備項目を登録できるよう、一意制約は (motorcycle_id, item_name) とする。

create table public.maintenance_cycle_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  item_name text not null,
  category text not null,
  distance_interval_km integer check (distance_interval_km is null or distance_interval_km > 0),
  period_interval_months integer check (period_interval_months is null or period_interval_months > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_cycle_settings_interval_required
    check (distance_interval_km is not null or period_interval_months is not null),
  constraint maintenance_cycle_settings_motorcycle_item_key
    unique (motorcycle_id, item_name)
);

create index maintenance_cycle_settings_user_id_idx
on public.maintenance_cycle_settings(user_id);

create index maintenance_cycle_settings_motorcycle_id_idx
on public.maintenance_cycle_settings(motorcycle_id);

alter table public.maintenance_cycle_settings enable row level security;

create policy "Users can select own maintenance cycle settings"
on public.maintenance_cycle_settings
for select to authenticated
using ((select auth.uid()) = user_id);

-- motorcycle_id が自分の所有するバイクであることをRLSレベルでも保証する
-- (Server Action / RPC側でも別途所有権チェックを行うが、二重の防御として設定)
create policy "Users can insert own maintenance cycle settings"
on public.maintenance_cycle_settings
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

grant select, insert on public.maintenance_cycle_settings to authenticated;
