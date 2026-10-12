-- カスタムパーツ費用管理 MVP: custom_parts テーブルの作成。
--
-- 整備記録(maintenance_records)とは完全に別テーブル・別画面にする。
-- 「チェーンを社外品にアップグレードした」のような、整備記録のカテゴリーと
-- カスタム費用のどちらか一方に決め切れないケースがあるため、カテゴリー欄への
-- 相乗り(以前のmaintenance_records拡張案)ではなく、記録先そのものを分離する
-- 方針にした。整備サイクル設定・スケジュールとは連動しない(RPC関数は使わず、
-- insurance_policiesと同じ「RLS + Server Actionでの明示的な所有権確認」の
-- 二重防御で、素朴なinsert/update/deleteを行う)。
--
-- 将来の「整備・カスタム・保険・ローンの大ジャンル別費用比率」集計を見据え、
-- costを持たせつつ既存のmaintenance_recordsの費用分析(lib/cost-analysis.ts)
-- とは独立させておく(現時点ではコード側の集計への統合は行わない。スコープを
-- 小さく保つための意図的な判断で、必要になれば別途対応する)。

create table public.custom_parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  part_name text not null,
  -- maintenance_records.category と同じ方針(CHECK制約なしの単純なtext列)。
  -- 固定選択肢への制限はフロント(lib/custom-part.ts CUSTOM_PART_CATEGORIES)と
  -- Server Action側で行う。
  category text not null,
  brand text,
  shop_name text,
  purchase_date date not null,
  mileage integer check (mileage is null or mileage >= 0),
  cost integer check (cost is null or cost >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_parts_part_name_length check (char_length(part_name) <= 50),
  constraint custom_parts_brand_length check (brand is null or char_length(brand) <= 50),
  constraint custom_parts_shop_name_length check (shop_name is null or char_length(shop_name) <= 50),
  constraint custom_parts_note_length check (note is null or char_length(note) <= 1000)
);

create index custom_parts_user_id_idx
on public.custom_parts(user_id);

create index custom_parts_motorcycle_id_purchase_date_idx
on public.custom_parts(motorcycle_id, purchase_date desc);

alter table public.custom_parts enable row level security;

create policy "Users can select own custom parts"
on public.custom_parts
for select to authenticated
using ((select auth.uid()) = user_id);

-- motorcycle_id が自分の所有するバイクであることをRLSレベルでも保証する
-- (Server Action側でも別途所有権チェックを行うが、二重の防御として設定)
create policy "Users can insert own custom parts"
on public.custom_parts
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

create policy "Users can update own custom parts"
on public.custom_parts
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

create policy "Users can delete own custom parts"
on public.custom_parts
for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.custom_parts to authenticated;

-- set_updated_at() は motorcycles 用マイグレーション(20260813140000)で
-- 既に作成済みの汎用トリガー関数を再利用する。
create trigger custom_parts_set_updated_at
before update on public.custom_parts
for each row
execute function public.set_updated_at();
