-- Milestone 3 (後半): maintenance_records の更新・削除に対応
-- UPDATE/DELETEポリシーと権限、updated_at自動更新トリガーを追加する。
-- (既存マイグレーションは変更しない)

-- UPDATEは「本人の記録であること」に加え「紐づくバイクも本人所有であること」を
-- RLSレベルでも二重に確認する(motorcycle_id は編集フォームでは変更しない想定だが、
-- 念のため using/with check の両方でチェックする)。
create policy "Users can update own maintenance records"
on public.maintenance_records
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

create policy "Users can delete own maintenance records"
on public.maintenance_records
for delete to authenticated
using ((select auth.uid()) = user_id);

grant update, delete on public.maintenance_records to authenticated;

-- set_updated_at() は motorcycles 用マイグレーション(20260813140000)で
-- 既に作成済みの汎用トリガー関数を再利用する。
create trigger maintenance_records_set_updated_at
before update on public.maintenance_records
for each row
execute function public.set_updated_at();
