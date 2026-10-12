import type Stripe from "stripe";
import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/server";

// 署名検証にはraw bodyとNode cryptoが必要なため、明示的にNode runtimeを指定する。
export const runtime = "nodejs";

// このエンドポイントはStripeからの未認証(セッションCookieなし)リクエストを受ける前提。
// lib/supabase/proxy.ts 側でもこのパスを未認証リダイレクトの対象外にしている。
async function recordSupportPayment(session: Stripe.Checkout.Session) {
  // 「応援」以外のCheckout Session(将来サブスク等を追加した場合)を誤って
  // 記録しないよう、支援決済であることを示すmetadataを見て判定する。
  if (session.metadata?.type !== "support" || session.payment_status === "unpaid") {
    return;
  }

  const userId = session.client_reference_id;
  const amount = session.amount_total;

  if (!userId || amount === null || amount === undefined) {
    console.error(
      "[stripe webhook] support checkout session missing client_reference_id or amount_total:",
      session.id,
    );
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("support_payments")
    .upsert(
      {
        user_id: userId,
        amount,
        currency: session.currency ?? "jpy",
        stripe_checkout_session_id: session.id,
      },
      { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true },
    );

  if (error) {
    console.error("[stripe webhook] failed to record support payment:", error.code, error.message);
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe webhook] signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await recordSupportPayment(event.data.object as Stripe.Checkout.Session);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
