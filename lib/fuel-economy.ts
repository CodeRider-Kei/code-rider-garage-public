export type FuelEconomyPoint = {
  id: string; // このkm/Lの起点となった給油記録のid(=今回の給油)
  filled_on: string;
  shortLabel: string; // "8/21"
  kmPerLiter: number;
};

function toShortLabel(dateStr: string): string {
  const [, month, day] = dateStr.split("-").map(Number);
  return `${month}/${day}`;
}

/**
 * 満タン法による燃費(km/L)を、走行距離の入力がある「満タン給油」同士の
 * 連続ペアからのみ算出する。距離が未入力の記録・満タンでない記録・
 * 燃費が算出できないペア(距離差が0以下、給油量が0以下など)は結果に含めない。
 */
export function calculateFuelEconomy(
  records: {
    id: string;
    filled_on: string;
    mileage: number | null;
    liters: number;
    is_full_tank: boolean;
  }[],
): FuelEconomyPoint[] {
  const withMileage = records
    .filter(
      (r): r is typeof r & { mileage: number } => r.mileage !== null,
    )
    .sort((a, b) => {
      if (a.filled_on !== b.filled_on) {
        return a.filled_on < b.filled_on ? -1 : 1;
      }
      return a.mileage - b.mileage;
    });

  const points: FuelEconomyPoint[] = [];
  for (let i = 1; i < withMileage.length; i++) {
    const prev = withMileage[i - 1];
    const curr = withMileage[i];
    if (!prev.is_full_tank || !curr.is_full_tank) continue;

    const distance = curr.mileage - prev.mileage;
    if (distance <= 0 || curr.liters <= 0) continue;

    points.push({
      id: curr.id,
      filled_on: curr.filled_on,
      shortLabel: toShortLabel(curr.filled_on),
      kmPerLiter: distance / curr.liters,
    });
  }

  return points;
}
