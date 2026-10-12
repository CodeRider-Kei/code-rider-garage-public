// カスタムパーツ費用管理。整備記録(maintenance_records)とは別テーブルにする。
// 「チェーンを社外品にアップグレードした」のような場合に、整備記録のカテゴリーか
// カスタム費用かのどちらか一方に無理に寄せる必要が出ないよう、記録先そのものを
// 分離している(整備サイクル管理・カレンダーとは独立して管理する)。
// 目安: 同一スペック・同等品への交換は整備記録、社外品やワンランク上の
// グレードへの変更・追加はカスタムパーツ、として運用する想定。

// バイクで一般的に行われるカスタムのカテゴリー。整備記録(lib/maintenance-record.ts
// の MAINTENANCE_CATEGORIES)と同じ方針で、DB側はCHECK制約を持たない単純な
// text列とし、固定選択肢への制限はフロント(select)とServer Action側で行う。
export const CUSTOM_PART_CATEGORIES = [
  "マフラー",
  "外装・カウル",
  "ハンドル・グリップ",
  "サスペンション",
  "ホイール",
  "シート",
  "灯火類(ライト・ウインカー)",
  "電装品",
  "ステップ・ミラー",
  "その他",
] as const;

export type CustomPart = {
  id: string;
  part_name: string;
  category: string;
  brand: string | null;
  shop_name: string | null;
  purchase_date: string;
  mileage: number | null;
  cost: number | null;
  note: string | null;
};

export type CustomPartFormState = {
  error?: string;
  needsConfirmation?: boolean;
};

// フロント(maxLength)・Server Action・DB制約(CHECK)で共通して使う上限値。
export const CUSTOM_PART_NAME_MAX_LENGTH = 50;
export const CUSTOM_PART_BRAND_MAX_LENGTH = 50;
export const CUSTOM_PART_SHOP_NAME_MAX_LENGTH = 50;
export const CUSTOM_PART_NOTE_MAX_LENGTH = 1000;
