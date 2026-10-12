"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { MAINTENANCE_CATEGORIES } from "@/lib/maintenance-record";
import {
  MAINTENANCE_SCHEDULE_ITEM_NAME_MAX_LENGTH,
  MAINTENANCE_SCHEDULE_NOTE_MAX_LENGTH,
  type MaintenanceScheduleFormState,
} from "@/lib/maintenance-schedule";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function createMaintenanceSchedule(
  motorcycleId: string,
  _prevState: MaintenanceScheduleFormState,
  formData: FormData,
): Promise<MaintenanceScheduleFormState> {
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
    return { error: "このバイクへの整備予定登録権限がありません。" };
  }

  const itemName = String(formData.get("item_name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const nextDueDate = String(formData.get("next_due_date") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!itemName) {
    return { error: "整備項目名を入力してください。" };
  }

  if (itemName.length > MAINTENANCE_SCHEDULE_ITEM_NAME_MAX_LENGTH) {
    return {
      error: `整備項目名は${MAINTENANCE_SCHEDULE_ITEM_NAME_MAX_LENGTH}文字以内で入力してください。`,
    };
  }

  if (!category || !MAINTENANCE_CATEGORIES.includes(category as (typeof MAINTENANCE_CATEGORIES)[number])) {
    return { error: "カテゴリーを選択してください。" };
  }

  if (!nextDueDate || !DATE_PATTERN.test(nextDueDate)) {
    return { error: "次回予定日を入力してください。" };
  }

  if (note.length > MAINTENANCE_SCHEDULE_NOTE_MAX_LENGTH) {
    return { error: `メモは${MAINTENANCE_SCHEDULE_NOTE_MAX_LENGTH}文字以内で入力してください。` };
  }

  const { error } = await supabase.from("maintenance_schedules").insert({
    user_id: userId,
    motorcycle_id: motorcycleId,
    item_name: itemName,
    category,
    next_due_date: nextDueDate,
    note: note || null,
  });

  if (error) {
    console.error(
      "[createMaintenanceSchedule] insert failed:",
      error.code,
      error.message,
    );
    return { error: "登録に失敗しました。しばらくしてから再度お試しください。" };
  }

  redirect(`/motorcycles/${motorcycleId}`);
}
