-- 整備サイクル設定 MVP: テキスト項目への文字数上限をDB制約としても強制する。
-- フロント(maxLength)・Server Action(明示チェック)と同じ上限値に揃える。

alter table public.maintenance_cycle_settings
  add constraint maintenance_cycle_settings_item_name_length check (char_length(item_name) <= 50);
