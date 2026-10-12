"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getTodayDateString } from "@/lib/maintenance-schedule";
import { applyMileageUpdate } from "@/lib/motorcycle-mileage";
import type { UpdateMileageFormState } from "@/lib/motorcycle";

export async function updateMotorcycleMileage(
  motorcycleId: string,
  redirectTo: string,
  _prevState: UpdateMileageFormState,
  formData: FormData,
): Promise<UpdateMileageFormState> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();
  const user = userData?.claims;

  if (userError || !user) {
    redirect("/auth/login");
  }

  const userId = user.sub as string;

  const mileageRaw = String(formData.get("mileage") ?? "").trim();
  const force = formData.get("force") === "on";

  if (!mileageRaw) {
    return { error: "走行距離を入力してください。" };
  }

  const mileage = Number(mileageRaw);
  if (!Number.isInteger(mileage) || mileage < 0) {
    return { error: "走行距離は0以上の整数で入力してください。" };
  }

  const result = await applyMileageUpdate(supabase, {
    motorcycleId,
    userId,
    mileage,
    recordedOn: getTodayDateString(),
    force,
  });

  if (!result.ok) {
    return { error: result.error, needsConfirmation: result.needsConfirmation };
  }

  redirect(redirectTo);
}
