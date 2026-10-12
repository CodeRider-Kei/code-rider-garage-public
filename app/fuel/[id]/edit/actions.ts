"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  FUEL_RECORD_NOTE_MAX_LENGTH,
  type FuelRecordFormState,
} from "@/lib/fuel-record";
import { checkMileageAgainstCurrent } from "@/lib/mileage-confirmation";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function updateFuelRecord(
  _prevState: FuelRecordFormState,
  formData: FormData,
): Promise<FuelRecordFormState> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();
  const user = userData?.claims;

  if (userError || !user) {
    redirect("/auth/login");
  }

  const userId = user.sub as string;
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { error: "給油記録が見つかりません。" };
  }

  // 所有権確認(1): 給油記録自体が本人のものか
  const { data: existing } = await supabase
    .from("fuel_records")
    .select("id, motorcycle_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    return { error: "給油記録が見つかりません。" };
  }

  // 所有権確認(2): 紐づくバイクも本人所有か
  const { data: motorcycle } = await supabase
    .from("motorcycles")
    .select("id, current_mileage")
    .eq("id", existing.motorcycle_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!motorcycle) {
    return { error: "給油記録が見つかりません。" };
  }

  const filledOn = String(formData.get("filled_on") ?? "").trim();
  const mileageRaw = String(formData.get("mileage") ?? "").trim();
  const litersRaw = String(formData.get("liters") ?? "").trim();
  const costRaw = String(formData.get("cost") ?? "").trim();
  const isFullTank = formData.get("is_full_tank") === "on";
  const note = String(formData.get("note") ?? "").trim();
  const force = formData.get("force") === "on";

  if (!filledOn || !DATE_PATTERN.test(filledOn)) {
    return { error: "給油日を入力してください。" };
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

  const liters = Number(litersRaw);
  if (litersRaw === "" || !Number.isFinite(liters) || liters <= 0) {
    return { error: "給油量は0より大きい数値で入力してください。" };
  }

  let cost: number | null = null;
  if (costRaw !== "") {
    cost = Number(costRaw);
    if (!Number.isInteger(cost) || cost < 0) {
      return { error: "費用は0以上の整数で入力してください。" };
    }
  }

  if (note.length > FUEL_RECORD_NOTE_MAX_LENGTH) {
    return { error: `メモは${FUEL_RECORD_NOTE_MAX_LENGTH}文字以内で入力してください。` };
  }

  const { data: updated, error } = await supabase
    .from("fuel_records")
    .update({
      filled_on: filledOn,
      mileage,
      liters,
      cost,
      is_full_tank: isFullTank,
      note: note || null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    console.error("[updateFuelRecord] update failed:", error.code, error.message);
    return { error: "更新に失敗しました。しばらくしてから再度お試しください。" };
  }

  if (!updated || updated.length === 0) {
    return { error: "給油記録が見つかりません。" };
  }

  redirect(`/motorcycles/${existing.motorcycle_id}`);
}
