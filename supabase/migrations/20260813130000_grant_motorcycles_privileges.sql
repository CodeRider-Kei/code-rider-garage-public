-- motorcycles テーブルへの基本権限(GRANT)を authenticated ロールに付与
-- RLSポリシーは行レベルのフィルタであり、事前にテーブルレベルの
-- SELECT/INSERT権限がロールに付与されている必要があるため追加する。
-- (42501 permission denied for table motorcycles への対処)

grant select, insert on public.motorcycles to authenticated;
