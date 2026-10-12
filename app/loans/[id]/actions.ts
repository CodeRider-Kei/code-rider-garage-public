"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function deleteLoan(formData: FormData): Promise<void> {
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
    // 所有権確認(1): ローン自体が本人のものか
    const { data: existing } = await supabase
      .from("loans")
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

        const { error } = await supabase
          .from("loans")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);

        if (error) {
          console.error("[deleteLoan] delete failed:", error.code, error.message);
        }
      }
    }
  }

  redirect(redirectTarget);
}
