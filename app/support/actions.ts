"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/server";
import { SITE_URL } from "@/lib/site-url";

// 「応援」の金額は自由入力にせず、この固定プリセットのみ受け付ける
// (不正な金額の送信を防ぐ)。
const SUPPORT_AMOUNTS_YEN = [300, 500, 1000] as const;

export async function createSupportCheckoutSession(amountYen: number) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();
  const user = userData?.claims;

  if (userError || !user) {
    redirect("/auth/login");
  }

  if (!SUPPORT_AMOUNTS_YEN.includes(amountYen as (typeof SUPPORT_AMOUNTS_YEN)[number])) {
    redirect("/support?error=1");
  }

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    // client_reference_id / metadata は、Webhookハンドラ
    // (app/api/stripe/webhook/route.ts)が support_payments に記録する際に
    // 「誰が」「どの決済が応援なのか」を判定するために使う。
    client_reference_id: user.sub as string,
    metadata: { type: "support" },
    // StripeのManaged Payments(マーチャント・オブ・レコード機能)がアカウントで
    // デフォルト有効になっていると、line_itemsの商品にtax_codeが無い場合に
    // Checkout Session作成がエラーになる。この決済は消費税の課税区分を判断できる
    // ような「商品」ではなく単発の応援(投げ銭)であり、tax_codeを推測で設定する
    // (法的な課税区分の判断が必要)のは避けたいため、このセッションに限り
    // Managed Paymentsを無効化する。
    managed_payments: { enabled: false },
    line_items: [
      {
        price_data: {
          currency: "jpy",
          product_data: { name: "Code Rider Garageの応援" },
          unit_amount: amountYen,
        },
        quantity: 1,
      },
    ],
    success_url: `${SITE_URL}/support?success=1`,
    cancel_url: `${SITE_URL}/support`,
  });

  if (!session.url) {
    redirect("/support?error=1");
  }

  redirect(session.url);
}
