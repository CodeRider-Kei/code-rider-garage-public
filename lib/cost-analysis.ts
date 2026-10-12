export type MonthlyCostPoint = {
  key: string; // "YYYY-MM"
  shortLabel: string; // "8月"
  fullLabel: string; // "2026年8月"
  cost: number;
};

export type CategoryCostPoint = {
  category: string;
  cost: number;
  percent: number;
};

// lib/mileage-analysis.ts の月別走行距離集計でも同じ12か月ウィンドウを使うため、
// ここから共有する。
export function getLast12MonthKeys(referenceDate: Date) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-indexed
  const months: { key: string; year: number; month: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(year, month - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    months.push({ key: `${y}-${String(m).padStart(2, "0")}`, year: y, month: m });
  }

  return months;
}

/**
 * 直近12か月(古い月から順)の月別費用を集計する。整備記録・カスタムパーツなど、
 * 日付+費用を持つ記録であれば呼び出し元でどのソースにも使える汎用関数。
 * 費用未入力(null)の記録は0円として扱う。対象期間外の記録は含めない。
 */
export function aggregateMonthlyCost(
  records: { date: string; cost: number | null }[],
  referenceDate: Date = new Date(),
): MonthlyCostPoint[] {
  const months = getLast12MonthKeys(referenceDate);
  const sums = new Map(months.map((m) => [m.key, 0]));

  for (const record of records) {
    const key = record.date.slice(0, 7);
    if (sums.has(key)) {
      sums.set(key, (sums.get(key) ?? 0) + (record.cost ?? 0));
    }
  }

  return months.map((m) => ({
    key: m.key,
    shortLabel: `${m.month}月`,
    fullLabel: `${m.year}年${m.month}月`,
    cost: sums.get(m.key) ?? 0,
  }));
}

/**
 * カテゴリー別費用を集計する(費用の多い順)。整備記録のカテゴリーだけでなく、
 * カスタムパーツのカテゴリーや保険の種類、整備/カスタム/保険といったソース単位の
 * 内訳など、「category」というラベル+費用の組であれば何にでも使える汎用関数。
 * 費用未入力(null)の記録は集計対象外とする。
 */
export function aggregateCategoryCost(
  records: { category: string; cost: number | null }[],
): CategoryCostPoint[] {
  const sums = new Map<string, number>();

  for (const record of records) {
    if (record.cost === null) continue;
    sums.set(record.category, (sums.get(record.category) ?? 0) + record.cost);
  }

  const total = [...sums.values()].reduce((sum, v) => sum + v, 0);

  return [...sums.entries()]
    .map(([category, cost]) => ({
      category,
      cost,
      percent: total > 0 ? (cost / total) * 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost);
}
