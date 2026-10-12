"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function deleteMaintenanceCycleSetting(formData: FormData): Promise<void> {
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
    // 所有権確認(1): 設定自体が本人のものか
    const { data: existing } = await supabase
      .from("maintenance_cycle_settings")
      .select("id, motorcycle_id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      // 所有権確認(2): 紐づくバイクも本人所有か
      const { data: motorcycle } = await supabase
        .from("motorcycles")
        .select("id")
        .eq("id", existing.motorcycle_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (motorcycle) {
        redirectTarget = `/motorcycles/${existing.motorcycle_id}`;

        // maintenance_schedules.cycle_setting_id は ON DELETE CASCADE のため、
        // この設定に紐づく自動予定(あれば)も同時に削除される。
        const { error } = await supabase
          .from("maintenance_cycle_settings")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);

        if (error) {
          console.error(
            "[deleteMaintenanceCycleSetting] delete failed:",
            error.code,
            error.message,
          );
        }
      }
    }
  }

  redirect(redirectTarget);
}
