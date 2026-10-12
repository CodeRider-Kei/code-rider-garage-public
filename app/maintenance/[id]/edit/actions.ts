"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_NOTE_MAX_LENGTH,
  type MaintenanceRecordFormState,
} from "@/lib/maintenance-record";
import { MAINTENANCE_CYCLE_SETTING_ITEM_NAME_MAX_LENGTH } from "@/lib/maintenance-cycle-setting";
import { checkMileageAgainstCurrent } from "@/lib/mileage-confirmation";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function updateMaintenanceRecord(
  _prevState: MaintenanceRecordFormState,
  formData: FormData,
): Promise<MaintenanceRecordFormState> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();
  const user = userData?.claims;

  if (userError || !user) {
    redirect("/auth/login");
  }

  const userId = user.sub as string;
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { error: "整備記録が見つかりません。" };
  }

  // 所有権確認(1): 整備記録自体が本人のものか
  const { data: existing } = await supabase
    .from("maintenance_records")
    .select("id, motorcycle_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    return { error: "整備記録が見つかりません。" };
  }

  // 所有権確認(2): 紐づくバイクも本人所有か
  const { data: motorcycle } = await supabase
    .from("motorcycles")
    .select("id, current_mileage")
    .eq("id", existing.motorcycle_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!motorcycle) {
    return { error: "整備記録が見つかりません。" };
  }

  const maintenanceDate = String(formData.get("maintenance_date") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const mileageRaw = String(formData.get("mileage") ?? "").trim();
  const costRaw = String(formData.get("cost") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const force = formData.get("force") === "on";
  const cycleSettingIdRaw = String(formData.get("cycle_setting_id") ?? "").trim();
  const itemNameRaw = String(formData.get("item_name") ?? "").trim();
  const distanceRaw = String(formData.get("distance_interval_km") ?? "").trim();
  const periodRaw = String(formData.get("period_interval_months") ?? "").trim();

  if (!maintenanceDate || !DATE_PATTERN.test(maintenanceDate)) {
    return { error: "整備日を入力してください。" };
  }

  if (!category || !MAINTENANCE_CATEGORIES.includes(category as (typeof MAINTENANCE_CATEGORIES)[number])) {
    return { error: "カテゴリーを選択してください。" };
  }

  let mileage: number | null = null;
  if (mileageRaw !== "") {
    mileage = Number(mileageRaw);
    if (!Number.isInteger(mileage) || mileage < 0) {
      return { error: "走行距離は0以上の整数で入力してください。" };
    }
  }

  const mileageConfirmation = checkMileageAgainstCurrent(
    mileage,
    motorcycle.current_mileage,
    force,
  );
  if (mileageConfirmation) {
    return mileageConfirmation;
  }

  let cost: number | null = null;
  if (costRaw !== "") {
    cost = Number(costRaw);
    if (!Number.isInteger(cost) || cost < 0) {
      return { error: "費用は0以上の整数で入力してください。" };
    }
  }

  if (note.length > MAINTENANCE_NOTE_MAX_LENGTH) {
    return { error: `メモは${MAINTENANCE_NOTE_MAX_LENGTH}文字以内で入力してください。` };
  }

  let cycleSettingId: string | null = null;
  let itemName: string | null = null;
  let distanceIntervalKm: number | null = null;
  let periodIntervalMonths: number | null = null;

  if (cycleSettingIdRaw !== "") {
    cycleSettingId = cycleSettingIdRaw;

    if (!itemNameRaw) {
      return { error: "次回整備時期を設定する場合は項目名を入力してください。" };
    }
    if (itemNameRaw.length > MAINTENANCE_CYCLE_SETTING_ITEM_NAME_MAX_LENGTH) {
      return {
        error: `項目名は${MAINTENANCE_CYCLE_SETTING_ITEM_NAME_MAX_LENGTH}文字以内で入力してください。`,
      };
    }
    itemName = itemNameRaw;

    if (distanceRaw !== "") {
      distanceIntervalKm = Number(distanceRaw);
      if (!Number.isInteger(distanceIntervalKm) || distanceIntervalKm <= 0) {
        return { error: "次回までの走行距離は1以上の整数(km)で入力してください。" };
      }
      if (mileage === null) {
        return { error: "次回までの走行距離を指定する場合は実施時走行距離を入力してください。" };
      }
    }

    if (periodRaw !== "") {
      periodIntervalMonths = Number(periodRaw);
      if (!Number.isInteger(periodIntervalMonths) || periodIntervalMonths <= 0) {
        return { error: "次回までの期間は1以上の整数(か月)で入力してください。" };
      }
    }

    if (distanceIntervalKm === null && periodIntervalMonths === null) {
      return { error: "次回までの走行距離・期間のいずれかを入力してください。" };
    }
  }

  const { error } = await supabase.rpc("update_maintenance_record_with_schedule", {
    p_record_id: id,
    p_maintenance_date: maintenanceDate,
    p_category: category,
    p_mileage: mileage,
    p_cost: cost,
    p_note: note || null,
    p_cycle_setting_id: cycleSettingId,
    p_item_name: itemName,
    p_distance_interval_km: distanceIntervalKm,
    p_period_interval_months: periodIntervalMonths,
  });

  if (error) {
    console.error(
      "[updateMaintenanceRecord] rpc failed:",
      error.code,
      error.message,
    );
    return { error: "更新に失敗しました。しばらくしてから再度お試しください。" };
  }

  redirect(`/maintenance/${id}`);
}
