// ローン費用管理機能。整備記録・カスタムパーツ・保険・給油とは性質が異なり、
// 「毎回記録するイベント」ではなく「契約1件=1行」(insurance_policiesと同じ形)。
// 実際の返済実績は記録せず、契約条件(元金・期間・金利or月々支払額・開始日)だけを
// 保存し、残高や利息は lib/loan-calculation.ts の純粋関数で都度計算する。

export type Loan = {
  id: string;
  lender_name: string;
  principal: number;
  annual_interest_rate: number | null;
  monthly_payment: number | null;
  term_months: number;
  start_date: string;
  // 賞与払い(年2回固定、月はユーザー指定)。3つとも null か、3つとも非null。
  bonus_payment_amount: number | null;
  bonus_month_1: number | null;
  bonus_month_2: number | null;
  note: string | null;
};

export type LoanFormState = {
  error?: string;
};

// フロント・Server Action・DB制約(CHECK)で共通して使う上限値。
export const LOAN_LENDER_NAME_MAX_LENGTH = 50;
export const LOAN_NOTE_MAX_LENGTH = 1000;

export type BonusPaymentFields = {
  bonusPaymentAmount: number | null;
  bonusMonth1: number | null;
  bonusMonth2: number | null;
};

/**
 * 賞与払い3項目(加算額・賞与月1・賞与月2)を検証する。3つとも空なら
 * 賞与払いなし、3つとも入力されていれば賞与払いあり。それ以外(一部だけ入力)
 * はエラーにする(DB制約 loans_bonus_fields_consistent と同じルール)。
 * createLoan/updateLoanの両方から呼ぶ共通ロジック。
 */
export function parseBonusPaymentFields(
  bonusPaymentAmountRaw: string,
  bonusMonth1Raw: string,
  bonusMonth2Raw: string,
): { ok: true; fields: BonusPaymentFields } | { ok: false; error: string } {
  const allEmpty =
    bonusPaymentAmountRaw === "" && bonusMonth1Raw === "" && bonusMonth2Raw === "";
  if (allEmpty) {
    return {
      ok: true,
      fields: { bonusPaymentAmount: null, bonusMonth1: null, bonusMonth2: null },
    };
  }

  const allFilled =
    bonusPaymentAmountRaw !== "" && bonusMonth1Raw !== "" && bonusMonth2Raw !== "";
  if (!allFilled) {
    return {
      ok: false,
      error: "賞与払いを設定する場合は、加算額と2つの月をすべて入力してください。",
    };
  }

  const bonusPaymentAmount = Number(bonusPaymentAmountRaw);
  if (!Number.isInteger(bonusPaymentAmount) || bonusPaymentAmount <= 0) {
    return { ok: false, error: "賞与月の加算額は1円以上の整数で入力してください。" };
  }

  const bonusMonth1 = Number(bonusMonth1Raw);
  const bonusMonth2 = Number(bonusMonth2Raw);
  const isValidMonth = (m: number) => Number.isInteger(m) && m >= 1 && m <= 12;
  if (!isValidMonth(bonusMonth1) || !isValidMonth(bonusMonth2)) {
    return { ok: false, error: "賞与月は1〜12の範囲で選択してください。" };
  }
  if (bonusMonth1 === bonusMonth2) {
    return { ok: false, error: "賞与月は異なる2つの月を選択してください。" };
  }

  return { ok: true, fields: { bonusPaymentAmount, bonusMonth1, bonusMonth2 } };
}
