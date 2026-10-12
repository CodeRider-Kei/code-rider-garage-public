-- 公開前監査対応: テキスト項目への文字数上限をDB制約としても強制する。
-- フロント(maxLength)・Server Action(明示チェック)と同じ上限値に揃える。
-- (既存マイグレーションは変更せず、新規ファイルとして追加)

alter table public.motorcycles
  add constraint motorcycles_name_length check (char_length(name) <= 50),
  add constraint motorcycles_manufacturer_length check (manufacturer is null or char_length(manufacturer) <= 50),
  add constraint motorcycles_model_length check (model is null or char_length(model) <= 50);

alter table public.maintenance_records
  add constraint maintenance_records_note_length check (note is null or char_length(note) <= 1000);
