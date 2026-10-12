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

export async function updateMaintenanceSchedule(
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
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { error: "整備予定が見つかりません。" };
  }

  // 所有権確認(1): 整備予定自体が本人のものか
  const { data: existing } = await supabase
    .from("maintenance_schedules")
    .select("id, motorcycle_id, cycle_setting_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    return { error: "整備予定が見つかりません。" };
  }

  // 所有権確認(2): 紐づくバイクも本人所有か
  const { data: motorcycle } = await supabase
    .from("motorcycles")
    .select("id")
    .eq("id", existing.motorcycle_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!motorcycle) {
    return { error: "整備予定が見つかりません。" };
  }

  // サイクル設定から自動生成された予定は、整備記録の保存を通じてのみ更新される。
  // 手動編集による不整合を防ぐため、このフォームからの直接編集は許可しない。
  if (existing.cycle_setting_id) {
    return {
      error: "この予定はサイクル設定から自動計算されているため、直接編集できません。",
    };
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

  const { data, error } = await supabase
    .from("maintenance_schedules")
    .update({
      item_name: itemName,
      category,
      next_due_date: nextDueDate,
      note: note || null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    console.error(
      "[updateMaintenanceSchedule] update failed:",
      error.code,
      error.message,
    );
    return { error: "更新に失敗しました。しばらくしてから再度お試しください。" };
  }

  if (!data || data.length === 0) {
    return { error: "整備予定が見つかりません。" };
  }

  redirect(`/motorcycles/${existing.motorcycle_id}`);
}
