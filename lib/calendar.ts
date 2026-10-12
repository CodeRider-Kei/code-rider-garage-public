// 月間カレンダー用の日付演算(依存ライブラリなし、純粋関数のみ)。
// 週の開始は日曜日固定。UTC基準のDate計算で月またぎを自動的に処理する
// (実際の「今日」判定は lib/maintenance-schedule.ts の getTodayDateString に委ねる)。

export const WEEKDAY_LABELS_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

export type CalendarCell = {
  date: string; // YYYY-MM-DD
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * 指定した年月(month: 1-12)のカレンダーグリッド(週の完全な倍数のセル数)を返す。
 * 前後月の日付は isCurrentMonth: false としてグレーアウト表示できるようにする。
 */
export function getMonthGrid(
  year: number,
  month: number,
  todayDateStr: string,
): CalendarCell[] {
  const startWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - startWeekday + 1;
    const cellDate = new Date(Date.UTC(year, month - 1, dayOffset));
    const date = formatDate(
      cellDate.getUTCFullYear(),
      cellDate.getUTCMonth() + 1,
      cellDate.getUTCDate(),
    );
    cells.push({
      date,
      day: cellDate.getUTCDate(),
      isCurrentMonth: dayOffset >= 1 && dayOffset <= daysInMonth,
      isToday: date === todayDateStr,
    });
  }
  return cells;
}

/** year/month(1-12)を delta か月分ずらした年月を返す(マイナスで過去へ)。 */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}
