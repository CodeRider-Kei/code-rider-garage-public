// 保険費用管理機能。整備記録とは性質が異なる(走行距離に紐づかず、
// 一定期間ごとに更新される契約)ため、独立したテーブル(insurance_policies)として扱う。
// 更新期限の判定は lib/maintenance-schedule.ts の getDueStatus を再利用する
// (期限までの日数で overdue/due_soon/ok を判定するロジックはドメインに依存しない)。

export const INSURANCE_TYPES = ["compulsory", "voluntary"] as const;

export type InsuranceType = (typeof INSURANCE_TYPES)[number];

export const INSURANCE_TYPE_LABEL: Record<InsuranceType, string> = {
  compulsory: "自賠責保険",
  voluntary: "任意保険",
};

// 保険料(premium_cost)は「選択した支払い頻度あたりの金額」として扱う
// (月払いを選べば月額、年払いを選べば年額を入力する)。頻度をまたいだ月額換算
// などの集計ロジックは未実装で、データとして頻度を保持するところまでが現状の対応範囲。
export const INSURANCE_PAYMENT_FREQUENCIES = ["monthly", "yearly"] as const;

export type InsurancePaymentFrequency = (typeof INSURANCE_PAYMENT_FREQUENCIES)[number];

export const INSURANCE_PAYMENT_FREQUENCY_LABEL: Record<InsurancePaymentFrequency, string> = {
  monthly: "月払い",
  yearly: "年払い",
};

export type InsurancePolicy = {
  id: string;
  insurance_type: InsuranceType;
  insurer_name: string;
  payment_frequency: InsurancePaymentFrequency;
  premium_cost: number | null;
  period_start: string;
  period_end: string;
  note: string | null;
};

export type InsurancePolicyFormState = {
  error?: string;
};

// フロント(maxLength)・Server Action・DB制約(CHECK)で共通して使う上限値。
export const INSURANCE_INSURER_NAME_MAX_LENGTH = 50;
export const INSURANCE_NOTE_MAX_LENGTH = 1000;
