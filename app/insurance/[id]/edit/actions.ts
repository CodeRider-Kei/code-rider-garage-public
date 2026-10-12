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

export async function updateInsurancePolicy(
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
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { error: "保険情報が見つかりません。" };
  }

  // 所有権確認(1): 保険情報自体が本人のものか
  const { data: existing } = await supabase
    .from("insurance_policies")
    .select("id, motorcycle_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    return { error: "保険情報が見つかりません。" };
  }

  // 所有権確認(2): 紐づくバイクも本人所有か
  const { data: motorcycle } = await supabase
    .from("motorcycles")
    .select("id")
    .eq("id", existing.motorcycle_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!motorcycle) {
    return { error: "保険情報が見つかりません。" };
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

  const { data: updated, error } = await supabase
    .from("insurance_policies")
    .update({
      insurance_type: insuranceType,
      insurer_name: insurerName,
      payment_frequency: paymentFrequency,
      premium_cost: premiumCost,
      period_start: periodStart,
      period_end: periodEnd,
      note: note || null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    console.error("[updateInsurancePolicy] update failed:", error.code, error.message);
    return { error: "更新に失敗しました。しばらくしてから再度お試しください。" };
  }

  if (!updated || updated.length === 0) {
    return { error: "保険情報が見つかりません。" };
  }

  redirect(`/motorcycles/${existing.motorcycle_id}`);
}
