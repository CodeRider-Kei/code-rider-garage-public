-- Milestone 3 (前半): maintenance_records テーブルの作成
-- 整備記録の登録・一覧表示に必要な最小限のスキーマとRLSポリシー(SELECT/INSERTのみ)。
-- UPDATE/DELETEポリシーは将来のMilestoneで追加する。

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  maintenance_date date not null,
  category text not null,
  mileage integer check (mileage >= 0),
  cost integer check (cost >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index maintenance_records_user_id_idx
on public.maintenance_records(user_id);

create index maintenance_records_motorcycle_id_date_idx
on public.maintenance_records(motorcycle_id, maintenance_date desc);

alter table public.maintenance_records enable row level security;

create policy "Users can select own maintenance records"
on public.maintenance_records
for select to authenticated
using ((select auth.uid()) = user_id);

-- motorcycle_id が自分の所有するバイクであることをRLSレベルでも保証する
-- (Server Action側でも別途所有権チェックを行うが、二重の防御として設定)
create policy "Users can insert own maintenance records"
on public.maintenance_records
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

grant select, insert on public.maintenance_records to authenticated;
