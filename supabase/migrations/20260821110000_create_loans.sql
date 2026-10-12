-- ローン費用管理 MVP: loans テーブルの作成。
--
-- 整備記録・カスタムパーツ・保険・給油とは性質が異なり、「毎回記録するイベント」
-- ではなく「契約1件=1行」(insurance_policiesと同じ形)。実際の返済実績を
-- 1件ずつ記録する方式ではなく、契約条件(元金・期間・金利or月々支払額・開始日)
-- だけを保存し、残高や利息は「計画通り返済している前提」で開始日からの経過月数を
-- 元に都度計算する(アプリ側のlib/loan-calculation.tsが担当)。
--
-- annual_interest_rate(年利)とmonthly_payment(月々支払額)はどちらか一方だけを
-- ユーザーが入力し、もう一方は表示時に計算する。両方null/両方非nullを防ぐため
-- CHECK制約でXOR(exactly one)を強制する。
--
-- 1台のバイクに複数ローン(車体ローン+社外パーツのローン等)を許容するため、
-- insurance_policiesと同じ1対多(motorcycle_idごとに複数行)の設計にする。
--
-- 賞与払い(ボーナス払い、年2回固定・月はユーザーが指定): bonus_payment_amount
-- (賞与月の加算額)・bonus_month_1/bonus_month_2(賞与月、1〜12)は3つとも
-- null(賞与払いなし)か、3つとも非null(賞与払いあり)のどちらかのみを許可する
-- (中途半端な状態を防ぐCHECK制約)。

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  lender_name text not null,
  principal integer not null check (principal > 0),
  annual_interest_rate numeric(5, 2) check (annual_interest_rate is null or annual_interest_rate >= 0),
  monthly_payment integer check (monthly_payment is null or monthly_payment > 0),
  term_months integer not null check (term_months > 0),
  start_date date not null,
  bonus_payment_amount integer check (bonus_payment_amount is null or bonus_payment_amount > 0),
  bonus_month_1 smallint check (bonus_month_1 is null or bonus_month_1 between 1 and 12),
  bonus_month_2 smallint check (bonus_month_2 is null or bonus_month_2 between 1 and 12),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loans_lender_name_length check (char_length(lender_name) <= 50),
  constraint loans_note_length check (note is null or char_length(note) <= 1000),
  -- 年利・月々支払額のどちらか一方のみを保存する(もう一方は表示時に計算する)
  constraint loans_rate_xor_payment check (
    (annual_interest_rate is not null) <> (monthly_payment is not null)
  ),
  constraint loans_bonus_fields_consistent check (
    (bonus_payment_amount is null and bonus_month_1 is null and bonus_month_2 is null)
    or (
      bonus_payment_amount is not null
      and bonus_month_1 is not null
      and bonus_month_2 is not null
      and bonus_month_1 <> bonus_month_2
    )
  )
);

create index loans_user_id_idx
on public.loans(user_id);

create index loans_motorcycle_id_idx
on public.loans(motorcycle_id);

alter table public.loans enable row level security;

create policy "Users can select own loans"
on public.loans
for select to authenticated
using ((select auth.uid()) = user_id);

-- motorcycle_id が自分の所有するバイクであることをRLSレベルでも保証する
-- (Server Action側でも別途所有権チェックを行うが、二重の防御として設定)
create policy "Users can insert own loans"
on public.loans
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

create policy "Users can update own loans"
on public.loans
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

create policy "Users can delete own loans"
on public.loans
for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.loans to authenticated;

-- set_updated_at() は motorcycles 用マイグレーション(20260813140000)で
-- 既に作成済みの汎用トリガー関数を再利用する。
create trigger loans_set_updated_at
before update on public.loans
for each row
execute function public.set_updated_at();
