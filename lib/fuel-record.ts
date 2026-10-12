// 給油ログ管理。整備記録・カスタムパーツとは別テーブル(fuel_records)にする。
// 給油は他の記録よりはるかに高頻度なイベントであり、連続する給油記録間の
// 走行距離から燃費(km/L)を算出するという固有の集計要件があるため。

export type FuelRecord = {
  id: string;
  filled_on: string;
  mileage: number | null;
  liters: number;
  cost: number | null;
  is_full_tank: boolean;
  note: string | null;
};

export type FuelRecordFormState = {
  error?: string;
  needsConfirmation?: boolean;
};

// フロント・Server Action・DB制約(CHECK)で共通して使う上限値。
export const FUEL_RECORD_NOTE_MAX_LENGTH = 1000;
