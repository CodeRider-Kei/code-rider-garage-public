// 1ユーザーが登録できるバイクの台数。DBスキーマ上の制約はなく、アプリ側(Server Action
// +登録ページ)でのみ強制する製品上のルール。将来値が変わる可能性があるため、
// 調整しやすいようこの定数1か所にまとめている。
export const FREE_MOTORCYCLE_LIMIT = 1;

export type Motorcycle = {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  current_mileage: number;
  mileage_recorded_on: string;
  displacement_cc: number | null;
  bike_type: BikeType | null;
  icon_color: IconColor | null;
};

export type MotorcycleFormState = {
  error?: string;
};

export type UpdateMileageFormState = {
  error?: string;
  needsConfirmation?: boolean;
};

// フロント(maxLength)・Server Action・DB制約(CHECK)で共通して使う上限値。
export const MOTORCYCLE_NAME_MAX_LENGTH = 50;
export const MOTORCYCLE_MANUFACTURER_MAX_LENGTH = 50;
export const MOTORCYCLE_MODEL_MAX_LENGTH = 50;

// 保存値は日本語表示名ではなく変更に強い固定キーを使う(表示名は components/motorcycle-type-icon.tsx 側で管理)。
export const BIKE_TYPES = [
  "naked",
  "cruiser",
  "full_fairing",
  "off_road",
  "adventure",
  "scooter",
  "streetfighter",
  "classic",
] as const;

export type BikeType = (typeof BIKE_TYPES)[number];

export const ICON_COLORS = [
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "purple",
  "slate",
] as const;

export type IconColor = (typeof ICON_COLORS)[number];
