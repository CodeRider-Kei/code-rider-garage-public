export type MaintenanceSchedule = {
  id: string;
  cycle_setting_id: string | null;
  item_name: string;
  category: string;
  next_due_date: string | null;
  next_due_mileage: number | null;
  distance_interval_km: number | null;
  note: string | null;
};

export type MaintenanceScheduleFormState = {
  error?: string;
};

// フロント(maxLength)・Server Action・DB制約(CHECK)で共通して使う上限値。
export const MAINTENANCE_SCHEDULE_ITEM_NAME_MAX_LENGTH = 50;
export const MAINTENANCE_SCHEDULE_NOTE_MAX_LENGTH = 1000;

// 「期限間近」とみなす日数のしきい値(固定値)。ユーザー設定・走行距離基準は対象外。
export const DUE_SOON_THRESHOLD_DAYS = 30;

export type DueStatus = "overdue" | "due_soon" | "ok";

export const DUE_STATUS_LABEL: Record<DueStatus, string> = {
  overdue: "期限超過",
  due_soon: "期限間近",
  ok: "余裕あり",
};

// バッジの配色。整備予定(maintenance-schedule-card.tsx)と保険更新期限
// (insurance-policy-card.tsx)の両方で使う共通の見た目なので、ここに集約する。
export const DUE_STATUS_BADGE_CLASS: Record<DueStatus, string> = {
  overdue: "border-transparent bg-red-600 text-white hover:bg-red-600/90",
  due_soon: "border-transparent bg-amber-500 text-white hover:bg-amber-500/90",
  ok: "border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90",
};

// 本サービスは日本の利用者のみを対象とするため、期限判定は常に日本時間の暦日を基準にする。
const APP_TIME_ZONE = "Asia/Tokyo";

/**
 * サーバーの実行環境(VercelなどUTCが多い)やブラウザのタイムゾーンに関わらず、
 * 常に日本時間での「今日」の日付(YYYY-MM-DD)を返す。
 */
export function getTodayDateString(referenceDate: Date = new Date()): string {
  // en-CA ロケールは YYYY-MM-DD 形式を返すため、パース不要でそのまま利用できる。
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(referenceDate);
}

function toUtcDayNumber(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / (1000 * 60 * 60 * 24);
}

/**
 * next_due_date(YYYY-MM-DD)を基準日(既定: 日本時間の今日)と比較し、
 * 期限超過・期限間近(しきい値日数以内)・余裕ありのいずれかを返す。
 * 日付文字列同士の暦日差分のみで判定するため、時刻・タイムゾーンの影響を受けない。
 */
export function getDueStatus(
  nextDueDate: string,
  todayDateStr: string = getTodayDateString(),
): DueStatus {
  const diffDays = toUtcDayNumber(nextDueDate) - toUtcDayNumber(todayDateStr);

  if (diffDays < 0) return "overdue";
  if (diffDays <= DUE_SOON_THRESHOLD_DAYS) return "due_soon";
  return "ok";
}

// 距離基準の「期限間近」とみなす割合(設定間隔の10%以内が残距離になったら間近扱い)。
export const DUE_SOON_MILEAGE_RATIO = 0.1;

// 距離基準の状態は日付基準と意味が異なる(「距離超過」)ため、別のラベルを用意する。
// 「期限間近」は日付・距離どちらでも同じ表現を使う。
export const MILEAGE_DUE_STATUS_LABEL: Record<DueStatus, string> = {
  overdue: "距離超過",
  due_soon: "期限間近",
  ok: "余裕あり",
};

/**
 * next_due_mileage(次回予定距離)と distance_interval_km(算出時点の距離間隔の
 * スナップショット)を基準に、距離超過・期限間近(残距離が間隔の10%以内)・
 * 余裕ありのいずれかを返す。
 */
export function getMileageDueStatus(
  nextDueMileage: number,
  distanceIntervalKm: number,
  currentMileage: number,
): DueStatus {
  const remaining = nextDueMileage - currentMileage;

  if (remaining <= 0) return "overdue";
  if (remaining <= distanceIntervalKm * DUE_SOON_MILEAGE_RATIO) return "due_soon";
  return "ok";
}
