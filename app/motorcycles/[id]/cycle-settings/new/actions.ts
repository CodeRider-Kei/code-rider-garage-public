"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { MAINTENANCE_CATEGORIES } from "@/lib/maintenance-record";
import {
  MAINTENANCE_CYCLE_SETTING_ITEM_NAME_MAX_LENGTH,
  type MaintenanceCycleSettingFormState,
} from "@/lib/maintenance-cycle-setting";

export async function createMaintenanceCycleSetting(
  motorcycleId: string,
  _prevState: MaintenanceCycleSettingFormState,
  formData: FormData,
): Promise<MaintenanceCycleSettingFormState> {
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
    return { error: "このバイクへのサイクル設定登録権限がありません。" };
  }

  const itemName = String(formData.get("item_name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const distanceRaw = String(formData.get("distance_interval_km") ?? "").trim();
  const periodRaw = String(formData.get("period_interval_months") ?? "").trim();

  if (!itemName) {
    return { error: "整備項目名を入力してください。" };
  }

  if (itemName.length > MAINTENANCE_CYCLE_SETTING_ITEM_NAME_MAX_LENGTH) {
    return {
      error: `整備項目名は${MAINTENANCE_CYCLE_SETTING_ITEM_NAME_MAX_LENGTH}文字以内で入力してください。`,
    };
  }

  if (!category || !MAINTENANCE_CATEGORIES.includes(category as (typeof MAINTENANCE_CATEGORIES)[number])) {
    return { error: "カテゴリーを選択してください。" };
  }

  let distanceIntervalKm: number | null = null;
  if (distanceRaw !== "") {
    distanceIntervalKm = Number(distanceRaw);
    if (!Number.isInteger(distanceIntervalKm) || distanceIntervalKm <= 0) {
      return { error: "距離間隔は1以上の整数(km)で入力してください。" };
    }
  }

  let periodIntervalMonths: number | null = null;
  if (periodRaw !== "") {
    periodIntervalMonths = Number(periodRaw);
    if (!Number.isInteger(periodIntervalMonths) || periodIntervalMonths <= 0) {
      return { error: "期間間隔は1以上の整数(か月)で入力してください。" };
    }
  }

  if (distanceIntervalKm === null && periodIntervalMonths === null) {
    return { error: "距離間隔・期間間隔のいずれかを入力してください。" };
  }

  const { error } = await supabase.from("maintenance_cycle_settings").insert({
    user_id: userId,
    motorcycle_id: motorcycleId,
    item_name: itemName,
    category,
    distance_interval_km: distanceIntervalKm,
    period_interval_months: periodIntervalMonths,
  });

  if (error) {
    console.error(
      "[createMaintenanceCycleSetting] insert failed:",
      error.code,
      error.message,
    );
    if (error.code === "23505") {
      return { error: "同じ名前の整備項目が既に登録されています。" };
    }
    return { error: "登録に失敗しました。しばらくしてから再度お試しください。" };
  }

  redirect(`/motorcycles/${motorcycleId}`);
}
