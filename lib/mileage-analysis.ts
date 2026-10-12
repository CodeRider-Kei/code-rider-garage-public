import { getLast12MonthKeys } from "./cost-analysis";

export type MileageReading = {
  date: string;
  mileage: number;
};

export type MonthlyMileagePoint = {
  key: string; // "YYYY-MM"
  shortLabel: string; // "8月"
  fullLabel: string; // "2026年8月"
  distance: number;
};

/**
 * 整備記録の走行距離や現在の走行距離といった「記録点」から、直近12か月の
 * 月別走行距離(その期間内に増えたおおよその距離)を集計する。専用の走行ログを
 * 持たないため、隣接する記録点の差分をその後ろの記録点の月にまとめて計上する
 * 簡易な目安であり、正確な日割りではない。同日に複数の記録点がある場合は
 * その日の最大値を採用し、記録の前後関係が乱れて差分が負になった場合は0とする。
 */
export function aggregateMonthlyDistance(
  readings: MileageReading[],
  referenceDate: Date = new Date(),
): MonthlyMileagePoint[] {
  const months = getLast12MonthKeys(referenceDate);
  const sums = new Map(months.map((m) => [m.key, 0]));

  const byDate = new Map<string, number>();
  for (const reading of readings) {
    const existing = byDate.get(reading.date);
    if (existing === undefined || reading.mileage > existing) {
      byDate.set(reading.date, reading.mileage);
    }
  }

  const sorted = [...byDate.entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );

  for (let i = 1; i < sorted.length; i++) {
    const [, prevMileage] = sorted[i - 1];
    const [currDate, currMileage] = sorted[i];
    const delta = Math.max(0, currMileage - prevMileage);
    const key = currDate.slice(0, 7);
    if (sums.has(key)) {
      sums.set(key, (sums.get(key) ?? 0) + delta);
    }
  }

  return months.map((m) => ({
    key: m.key,
    shortLabel: `${m.month}月`,
    fullLabel: `${m.year}年${m.month}月`,
    distance: sums.get(m.key) ?? 0,
  }));
}
