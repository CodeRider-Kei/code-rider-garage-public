/**
 * 整備記録・カスタムパーツの走行距離欄は任意項目で、過去の記録を入力する
 * ケースもあるため現在値より小さい値をブロックはしない。ただし誤入力
 * (桁の打ち間違いなど)に気付けるよう、走行距離クイック更新
 * (lib/motorcycle-mileage.ts の applyMileageUpdate)と同じ要領で、
 * 現在値より小さい場合は force が指定されない限り確認を挟む。
 */
export function checkMileageAgainstCurrent(
  mileage: number | null,
  currentMileage: number,
  force: boolean,
): { error: string; needsConfirmation: true } | null {
  if (mileage === null || mileage >= currentMileage || force) {
    return null;
  }

  return {
    needsConfirmation: true,
    error: `入力した走行距離(${mileage.toLocaleString("ja-JP")}km)は現在の記録(${currentMileage.toLocaleString("ja-JP")}km)より小さい値です。過去の記録などで誤りがなければ下のチェックを入れて再度お試しください。`,
  };
}
