-- 整備期限・次回交換時期管理 MVP: テキスト項目への文字数上限をDB制約としても強制する。
-- フロント(maxLength)・Server Action(明示チェック)と同じ上限値に揃える。
-- (既存マイグレーションは変更せず、新規ファイルとして追加)

alter table public.maintenance_schedules
  add constraint maintenance_schedules_item_name_length check (char_length(item_name) <= 50),
  add constraint maintenance_schedules_note_length check (note is null or char_length(note) <= 1000);
