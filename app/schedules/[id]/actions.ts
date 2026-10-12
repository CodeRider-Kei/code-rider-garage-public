"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function deleteMaintenanceSchedule(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();
  const user = userData?.claims;

  if (userError || !user) {
    redirect("/auth/login");
  }

  const userId = user.sub as string;
  const id = String(formData.get("id") ?? "").trim();

  // リダイレクト先は常にサーバー側で検証済みの値のみを使う(クライアント入力を信用しない)
  let redirectTarget = "/dashboard";

  if (id) {
    // 所有権確認(1): 整備予定自体が本人のものか
    const { data: existing } = await supabase
      .from("maintenance_schedules")
      .select("id, motorcycle_id, cycle_setting_id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    // サイクル設定から自動生成された予定は、整備記録の保存を通じてのみ更新される。
    // 削除したい場合はサイクル設定自体を削除する(連動して消える)。
    if (existing && !existing.cycle_setting_id) {
      // 所有権確認(2): 紐づくバイクも本人所有か
      const { data: motorcycle } = await supabase
        .from("motorcycles")
        .select("id")
        .eq("id", existing.motorcycle_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (motorcycle) {
        redirectTarget = `/motorcycles/${existing.motorcycle_id}`;

        const { error } = await supabase
          .from("maintenance_schedules")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);

        if (error) {
          console.error(
            "[deleteMaintenanceSchedule] delete failed:",
            error.code,
            error.message,
          );
        }
      }
    } else if (existing) {
      redirectTarget = `/motorcycles/${existing.motorcycle_id}`;
    }
  }

  redirect(redirectTarget);
}
