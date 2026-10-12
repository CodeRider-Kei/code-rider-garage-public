-- バイクタイプに「ストリートファイター」「クラシック」を追加する。
-- CHECK制約は列挙値の変更ができないため、既存制約を一度削除して同名で再作成する。
-- (適用済みマイグレーションは変更しない。既存データへの影響はなし)

alter table public.motorcycles
  drop constraint motorcycles_bike_type_allowed;

alter table public.motorcycles
  add constraint motorcycles_bike_type_allowed
    check (
      bike_type is null
      or bike_type in (
        'naked', 'cruiser', 'full_fairing', 'off_road', 'adventure', 'scooter',
        'streetfighter', 'classic'
      )
    );
