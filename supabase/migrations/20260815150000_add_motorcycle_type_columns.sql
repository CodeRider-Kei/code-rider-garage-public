-- バイク情報拡張: 排気量・バイクタイプ・アイコンカラーの追加
-- 既存レコードとの互換性を保つため、追加カラムはすべてnullableとする。
-- 一律の推測値は投入しない(既存行は追加カラムがnullのまま残る)。
-- (適用済みマイグレーションは変更しない)

alter table public.motorcycles
  add column displacement_cc integer,
  add column bike_type text,
  add column icon_color text;

-- 排気量は入力された場合のみ正の整数であることを保証する。
alter table public.motorcycles
  add constraint motorcycles_displacement_cc_positive
    check (displacement_cc is null or displacement_cc > 0);

-- バイクタイプ・アイコンカラーは、アプリ側(Server Action)のホワイトリスト検証に加え、
-- DB側でも許可値以外を保存できないようCHECK制約で二重に保証する。
alter table public.motorcycles
  add constraint motorcycles_bike_type_allowed
    check (
      bike_type is null
      or bike_type in ('naked', 'cruiser', 'full_fairing', 'off_road', 'adventure', 'scooter')
    );

alter table public.motorcycles
  add constraint motorcycles_icon_color_allowed
    check (
      icon_color is null
      or icon_color in ('red', 'orange', 'amber', 'green', 'teal', 'blue', 'purple', 'slate')
    );

-- RLS(SELECT/INSERT/UPDATE/DELETE)は行単位のポリシーであり、既存ポリシーが
-- 新規カラムにもそのまま適用されるため変更不要。GRANTも変更不要。
