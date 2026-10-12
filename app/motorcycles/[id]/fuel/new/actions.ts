"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  FUEL_RECORD_NOTE_MAX_LENGTH,
  type FuelRecordFormState,
} from "@/lib/fuel-record";
import { checkMileageAgainstCurrent } from "@/lib/mileage-confirmation";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function createFuelRecord(
  motorcycleId: string,
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

  // Server Action側でも所有権を明示的に確認する(RLSだけに頼らない)
  const { data: motorcycle } = await supabase
    .from("motorcycles")
    .select("id, current_mileage")
    .eq("id", motorcycleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!motorcycle) {
    return { error: "このバイクへの給油記録登録権限がありません。" };
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

  const { error } = await supabase.from("fuel_records").insert({
    user_id: userId,
    motorcycle_id: motorcycleId,
    filled_on: filledOn,
    mileage,
    liters,
    cost,
    is_full_tank: isFullTank,
    note: note || null,
  });

  if (error) {
    console.error("[createFuelRecord] insert failed:", error.code, error.message);
    return { error: "登録に失敗しました。しばらくしてから再度お試しください。" };
  }

  redirect(`/motorcycles/${motorcycleId}`);
}
