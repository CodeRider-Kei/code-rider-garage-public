-- 整備サイクル設定 MVP: maintenance_cycle_settings の更新・削除に対応
-- UPDATE/DELETEポリシーと権限、updated_at自動更新トリガーを追加する。
-- (既存マイグレーションは変更しない)

create policy "Users can update own maintenance cycle settings"
on public.maintenance_cycle_settings
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

create policy "Users can delete own maintenance cycle settings"
on public.maintenance_cycle_settings
for delete to authenticated
using ((select auth.uid()) = user_id);

grant update, delete on public.maintenance_cycle_settings to authenticated;

-- set_updated_at() は motorcycles 用マイグレーション(20260813140000)で
-- 既に作成済みの汎用トリガー関数を再利用する。
create trigger maintenance_cycle_settings_set_updated_at
before update on public.maintenance_cycle_settings
for each row
execute function public.set_updated_at();
