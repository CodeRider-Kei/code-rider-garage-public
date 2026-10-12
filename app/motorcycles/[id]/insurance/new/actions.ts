"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  INSURANCE_INSURER_NAME_MAX_LENGTH,
  INSURANCE_NOTE_MAX_LENGTH,
  INSURANCE_PAYMENT_FREQUENCIES,
  INSURANCE_TYPES,
  type InsurancePolicyFormState,
} from "@/lib/insurance";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function createInsurancePolicy(
  motorcycleId: string,
  _prevState: InsurancePolicyFormState,
  formData: FormData,
): Promise<InsurancePolicyFormState> {
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
    return { error: "このバイクへの保険情報登録権限がありません。" };
  }

  const insuranceType = String(formData.get("insurance_type") ?? "").trim();
  const insurerName = String(formData.get("insurer_name") ?? "").trim();
  const paymentFrequency = String(formData.get("payment_frequency") ?? "").trim();
  const premiumRaw = String(formData.get("premium_cost") ?? "").trim();
  const periodStart = String(formData.get("period_start") ?? "").trim();
  const periodEnd = String(formData.get("period_end") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!INSURANCE_TYPES.includes(insuranceType as (typeof INSURANCE_TYPES)[number])) {
    return { error: "保険の種類を選択してください。" };
  }

  if (!insurerName) {
    return { error: "保険会社名を入力してください。" };
  }
  if (insurerName.length > INSURANCE_INSURER_NAME_MAX_LENGTH) {
    return {
      error: `保険会社名は${INSURANCE_INSURER_NAME_MAX_LENGTH}文字以内で入力してください。`,
    };
  }

  if (
    !INSURANCE_PAYMENT_FREQUENCIES.includes(
      paymentFrequency as (typeof INSURANCE_PAYMENT_FREQUENCIES)[number],
    )
  ) {
    return { error: "支払い頻度を選択してください。" };
  }

  let premiumCost: number | null = null;
  if (premiumRaw !== "") {
    premiumCost = Number(premiumRaw);
    if (!Number.isInteger(premiumCost) || premiumCost < 0) {
      return { error: "保険料は0以上の整数で入力してください。" };
    }
  }

  if (!periodStart || !DATE_PATTERN.test(periodStart)) {
    return { error: "保険始期日を入力してください。" };
  }
  if (!periodEnd || !DATE_PATTERN.test(periodEnd)) {
    return { error: "保険終期日を入力してください。" };
  }
  if (periodEnd <= periodStart) {
    return { error: "保険終期日は保険始期日より後の日付を入力してください。" };
  }

  if (note.length > INSURANCE_NOTE_MAX_LENGTH) {
    return { error: `メモは${INSURANCE_NOTE_MAX_LENGTH}文字以内で入力してください。` };
  }

  const { error } = await supabase.from("insurance_policies").insert({
    user_id: userId,
    motorcycle_id: motorcycleId,
    insurance_type: insuranceType,
    insurer_name: insurerName,
    payment_frequency: paymentFrequency,
    premium_cost: premiumCost,
    period_start: periodStart,
    period_end: periodEnd,
    note: note || null,
  });

  if (error) {
    console.error("[createInsurancePolicy] insert failed:", error.code, error.message);
    return { error: "登録に失敗しました。しばらくしてから再度お試しください。" };
  }

  redirect(`/motorcycles/${motorcycleId}`);
}
