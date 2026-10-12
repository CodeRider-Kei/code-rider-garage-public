"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function deleteMotorcycle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();
  const user = userData?.claims;

  if (userError || !user) {
    redirect("/auth/login");
  }

  const userId = user.sub as string;
  const id = String(formData.get("id") ?? "").trim();

  if (id) {
    // 所有権確認: 存在しない場合と他人のバイクの場合を区別せず、
    // どちらも「何もしない」という同一の挙動にする(情報を外部に漏らさない)。
    const { data: existing } = await supabase
      .from("motorcycles")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("motorcycles")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("[deleteMotorcycle] delete failed:", error.code, error.message);
      }
    }
  }

  redirect("/dashboard");
}
