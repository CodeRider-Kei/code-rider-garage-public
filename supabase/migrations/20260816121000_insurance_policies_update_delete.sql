-- 保険費用管理 MVP: insurance_policies の更新・削除に対応
-- UPDATE/DELETEポリシーと権限、updated_at自動更新トリガーを追加する。
-- (既存マイグレーションは変更しない)

create policy "Users can update own insurance policies"
on public.insurance_policies
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

create policy "Users can delete own insurance policies"
on public.insurance_policies
for delete to authenticated
using ((select auth.uid()) = user_id);

grant update, delete on public.insurance_policies to authenticated;

-- set_updated_at() は motorcycles 用マイグレーション(20260813140000)で
-- 既に作成済みの汎用トリガー関数を再利用する。
create trigger insurance_policies_set_updated_at
before update on public.insurance_policies
for each row
execute function public.set_updated_at();
