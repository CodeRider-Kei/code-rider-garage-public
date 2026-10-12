"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  LOAN_LENDER_NAME_MAX_LENGTH,
  LOAN_NOTE_MAX_LENGTH,
  parseBonusPaymentFields,
  type LoanFormState,
} from "@/lib/loan";
import { getBonusMonthFlags } from "@/lib/loan-calculation";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function createLoan(
  motorcycleId: string,
  _prevState: LoanFormState,
  formData: FormData,
): Promise<LoanFormState> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();
  const user = userData?.claims;

  if (userError || !user) {
    redirect("/auth/login");
  }

  const userId = user.sub as string;

  // Server Action側でも所有権を明示的に確認する(RLSだけに頼らない)
  const { data: motorcycle } = await supabase
    .from("motorcycles")
    .select("id")
    .eq("id", motorcycleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!motorcycle) {
    return { error: "このバイクへのローン登録権限がありません。" };
  }

  const lenderName = String(formData.get("lender_name") ?? "").trim();
  const principalRaw = String(formData.get("principal") ?? "").trim();
  const termMonthsRaw = String(formData.get("term_months") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const annualInterestRateRaw = String(formData.get("annual_interest_rate") ?? "").trim();
  const monthlyPaymentRaw = String(formData.get("monthly_payment") ?? "").trim();
  const bonusPaymentAmountRaw = String(formData.get("bonus_payment_amount") ?? "").trim();
  const bonusMonth1Raw = String(formData.get("bonus_month_1") ?? "").trim();
  const bonusMonth2Raw = String(formData.get("bonus_month_2") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!lenderName) {
    return { error: "借入先を入力してください。" };
  }
  if (lenderName.length > LOAN_LENDER_NAME_MAX_LENGTH) {
    return { error: `借入先は${LOAN_LENDER_NAME_MAX_LENGTH}文字以内で入力してください。` };
  }

  const principal = Number(principalRaw);
  if (!principalRaw || !Number.isInteger(principal) || principal <= 0) {
    return { error: "借入総額は1円以上の整数で入力してください。" };
  }

  const termMonths = Number(termMonthsRaw);
  if (!termMonthsRaw || !Number.isInteger(termMonths) || termMonths <= 0) {
    return { error: "返済期間は1ヶ月以上の整数で入力してください。" };
  }

  if (!startDate || !DATE_PATTERN.test(startDate)) {
    return { error: "借入日を入力してください。" };
  }

  if (annualInterestRateRaw !== "" && monthlyPaymentRaw !== "") {
    return { error: "年利と月々支払額はどちらか一方のみ入力してください。" };
  }
  if (annualInterestRateRaw === "" && monthlyPaymentRaw === "") {
    return { error: "年利または月々支払額のどちらかを入力してください。" };
  }

  const bonusResult = parseBonusPaymentFields(
    bonusPaymentAmountRaw,
    bonusMonth1Raw,
    bonusMonth2Raw,
  );
  if (!bonusResult.ok) {
    return { error: bonusResult.error };
  }
  const { bonusPaymentAmount, bonusMonth1, bonusMonth2 } = bonusResult.fields;
  const bonusMonthFlags = getBonusMonthFlags(startDate, termMonths, bonusMonth1, bonusMonth2);
  const bonusCount = bonusMonthFlags.filter(Boolean).length;

  let annualInterestRate: number | null = null;
  let monthlyPayment: number | null = null;

  if (annualInterestRateRaw !== "") {
    annualInterestRate = Number(annualInterestRateRaw);
    if (!Number.isFinite(annualInterestRate) || annualInterestRate < 0) {
      return { error: "年利は0以上の数値で入力してください。" };
    }
  } else {
    monthlyPayment = Number(monthlyPaymentRaw);
    if (!Number.isInteger(monthlyPayment) || monthlyPayment <= 0) {
      return { error: "月々支払額は1円以上の整数で入力してください。" };
    }
    const minMonthlyPayment = Math.max(
      0,
      (principal - (bonusPaymentAmount ?? 0) * bonusCount) / termMonths,
    );
    if (monthlyPayment < minMonthlyPayment) {
      return {
        error:
          "月々支払額が返済期間・賞与払いに対して低すぎます。元金から賞与払い分を差し引いた額を返済期間で割った金額以上を入力してください。",
      };
    }
  }

  if (note.length > LOAN_NOTE_MAX_LENGTH) {
    return { error: `メモは${LOAN_NOTE_MAX_LENGTH}文字以内で入力してください。` };
  }

  const { error } = await supabase.from("loans").insert({
    user_id: userId,
    motorcycle_id: motorcycleId,
    lender_name: lenderName,
    principal,
    annual_interest_rate: annualInterestRate,
    monthly_payment: monthlyPayment,
    term_months: termMonths,
    start_date: startDate,
    bonus_payment_amount: bonusPaymentAmount,
    bonus_month_1: bonusMonth1,
    bonus_month_2: bonusMonth2,
    note: note || null,
  });

  if (error) {
    console.error("[createLoan] insert failed:", error.code, error.message);
    return { error: "登録に失敗しました。しばらくしてから再度お試しください。" };
  }

  redirect(`/motorcycles/${motorcycleId}`);
}
