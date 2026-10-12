-- 給油ログ(燃費計算)MVP: fuel_records テーブルの作成。
--
-- 整備記録(maintenance_records)・カスタムパーツ(custom_parts)とは別テーブルにする。
-- 給油は整備記録よりはるかに高頻度なイベントであり、連続する給油記録間の走行距離から
-- 燃費(km/L)を算出するという固有の集計要件があるため、custom_partsと同じ
-- 「RLS + Server Actionでの明示的な所有権確認」の二重防御パターンで、
-- 素朴なinsert/update/deleteを行う独立テーブルとする(RPC関数は使わない)。
--
-- liters(給油量)はこのアプリで初めての小数列。給油量は必須(燃費計算という
-- この機能の主目的そのものであるため)だが、走行距離(mileage)は他の記録と同様に
-- 任意項目のままとする(距離の記録がない給油記録は費用集計にのみ使われ、
-- 燃費計算からは自然に除外される)。
--
-- is_full_tank は「満タン法」による燃費計算の前提を表すフラグ。デフォルトtrueとし、
-- 大半のユーザーは意識せず満タン給油として扱われるが、部分給油だった場合に
-- チェックを外すことで、その記録を燃費計算のペアリングから除外できる。

create table public.fuel_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  filled_on date not null,
  mileage integer check (mileage is null or mileage >= 0),
  liters numeric(6, 2) not null check (liters > 0),
  cost integer check (cost is null or cost >= 0),
  is_full_tank boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fuel_records_note_length check (note is null or char_length(note) <= 1000)
);

create index fuel_records_user_id_idx
on public.fuel_records(user_id);

create index fuel_records_motorcycle_id_filled_on_idx
on public.fuel_records(motorcycle_id, filled_on desc);

alter table public.fuel_records enable row level security;

create policy "Users can select own fuel records"
on public.fuel_records
for select to authenticated
using ((select auth.uid()) = user_id);

-- motorcycle_id が自分の所有するバイクであることをRLSレベルでも保証する
-- (Server Action側でも別途所有権チェックを行うが、二重の防御として設定)
create policy "Users can insert own fuel records"
on public.fuel_records
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

create policy "Users can update own fuel records"
on public.fuel_records
for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.motorcycles
    where motorcycles.id = motorcycle_id
      and motorcycles.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.motorcycles
    where motorcycles.id = motorcycle_id
      and motorcycles.user_id = (select auth.uid())
  )
);

create policy "Users can delete own fuel records"
on public.fuel_records
for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.fuel_records to authenticated;

-- set_updated_at() は motorcycles 用マイグレーション(20260813140000)で
-- 既に作成済みの汎用トリガー関数を再利用する。
create trigger fuel_records_set_updated_at
before update on public.fuel_records
for each row
execute function public.set_updated_at();
