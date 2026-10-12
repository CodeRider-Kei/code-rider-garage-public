-- Milestone 2 (前半): motorcycles テーブルの作成
-- 登録・一覧表示に必要な最小限のスキーマとRLSポリシー(SELECT/INSERTのみ)。
-- 編集・削除ポリシーはMilestone 2後半で追加する。

create table public.motorcycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  manufacturer text,
  model text,
  current_mileage integer not null default 0 check (current_mileage >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index motorcycles_user_id_idx
on public.motorcycles(user_id);

alter table public.motorcycles enable row level security;

create policy "Users can select own motorcycles"
on public.motorcycles
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own motorcycles"
on public.motorcycles
for insert to authenticated
with check ((select auth.uid()) = user_id);
