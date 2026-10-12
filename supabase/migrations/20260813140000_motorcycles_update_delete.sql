-- Milestone 2 (後半): motorcycles の更新・削除に対応
-- UPDATE/DELETEポリシーと権限、updated_at自動更新トリガーを追加する。
-- (既存マイグレーションは変更しない)

create policy "Users can update own motorcycles"
on public.motorcycles
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own motorcycles"
on public.motorcycles
for delete to authenticated
using ((select auth.uid()) = user_id);

grant update, delete on public.motorcycles to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger motorcycles_set_updated_at
before update on public.motorcycles
for each row
execute function public.set_updated_at();
