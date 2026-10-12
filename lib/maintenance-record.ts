export const MAINTENANCE_CATEGORIES = [
  "エンジンオイル",
  "オイルフィルター",
  "タイヤ",
  "チェーン",
  "ブレーキパッド",
  "バッテリー",
  "車検・点検",
  "その他",
] as const;

export type MaintenanceRecord = {
  id: string;
  maintenance_date: string;
  category: string;
  mileage: number | null;
  cost: number | null;
  note: string | null;
  cycle_setting_id: string | null;
  item_name: string | null;
  distance_interval_km: number | null;
  period_interval_months: number | null;
};

export type MaintenanceRecordFormState = {
  error?: string;
  needsConfirmation?: boolean;
};

// フロント(maxLength)・Server Action・DB制約(CHECK)で共通して使う上限値。
export const MAINTENANCE_NOTE_MAX_LENGTH = 1000;

export function formatMaintenanceDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
