-- 保険費用管理 MVP: テキスト項目への文字数上限をDB制約としても強制する。
-- フロント(maxLength)・Server Action(明示チェック)と同じ上限値に揃える。

alter table public.insurance_policies
  add constraint insurance_policies_insurer_name_length check (char_length(insurer_name) <= 50),
  add constraint insurance_policies_policy_number_length check (policy_number is null or char_length(policy_number) <= 50),
  add constraint insurance_policies_note_length check (note is null or char_length(note) <= 1000);
