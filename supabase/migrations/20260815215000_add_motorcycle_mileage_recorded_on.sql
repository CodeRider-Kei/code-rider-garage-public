-- 走行距離管理の見直し: 走行距離は「日々更新される値」ではなく、
-- 「最後に入力された時点のスナップショット」として扱う。
-- 現在値だけでなく、その値がいつ時点のものかを保持することで、
-- 古い走行距離から現在の到達状況を断定しないようにする。
--
-- 既存行は current_mileage を登録時点の値として持っているため、
-- 追加列のデフォルトを current_date とし、既存データを壊さずに
-- 「今日時点の値」として扱う(実際の入力日時は失われているため近似)。
-- (既存マイグレーションは変更しない)

alter table public.motorcycles
  add column mileage_recorded_on date not null default current_date;
