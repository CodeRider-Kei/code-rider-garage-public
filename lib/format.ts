/** 円建て金額の共通表示フォーマット("12,345 円")。ローン計算等の小数値は丸める。 */
export function formatYen(value: number): string {
  return `${Math.round(value).toLocaleString("ja-JP")} 円`;
}
