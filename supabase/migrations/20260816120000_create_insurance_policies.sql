-- 保険費用管理 MVP: insurance_policies テーブルの作成。
--
-- 整備記録(maintenance_records)とは別テーブルにする。保険契約は走行距離に
-- 紐づかず、一定期間(period_start〜period_end)で区切られる点が整備記録と
-- 性質が異なるため。更新期限の判定はlib/maintenance-schedule.tsの
-- getDueStatus(period_endを「次回期限」とみなす)をそのまま再利用する。
--
-- 登録・一覧表示に必要な最小限のスキーマとRLSポリシー(SELECT/INSERTのみ)。
-- UPDATE/DELETEポリシーは次のマイグレーションで追加する
-- (maintenance_cycle_settingsと同じ2段階の流儀)。

create table public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  insurance_type text not null check (insurance_type in ('compulsory', 'voluntary')),
  insurer_name text not null,
  policy_number text,
  premium_cost integer check (premium_cost is null or premium_cost >= 0),
  period_start date not null,
  period_end date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint insurance_policies_period_valid check (period_end > period_start)
);

create index insurance_policies_user_id_idx
on public.insurance_policies(user_id);

create index insurance_policies_motorcycle_id_period_end_idx
on public.insurance_policies(motorcycle_id, period_end asc);

alter table public.insurance_policies enable row level security;

create policy "Users can select own insurance policies"
on public.insurance_policies
for select to authenticated
using ((select auth.uid()) = user_id);

-- motorcycle_id が自分の所有するバイクであることをRLSレベルでも保証する
-- (Server Action側でも別途所有権チェックを行うが、二重の防御として設定)
create policy "Users can insert own insurance policies"
on public.insurance_policies
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

grant select, insert on public.insurance_policies to authenticated;
