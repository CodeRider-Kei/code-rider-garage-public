import "server-only";

import Stripe from "stripe";

/**
 * Stripeクライアント。
 *
 * `import "server-only"` により、この関数をClient Componentから
 * importしようとするとビルドエラーになる(構成として強制される)。
 *
 * STRIPE_SECRET_KEY は NEXT_PUBLIC_ を付けないサーバー専用の環境変数として
 * `.env.local` / Netlify の環境変数に設定すること。フルの secret key
 * (`sk_...`)ではなく、必要な権限(Checkout Sessionsの作成など)のみに
 * 絞った Restricted Key(`rk_...`)を推奨する。
 *
 * グローバルな `stripe.apiKey = ...` は使わず、都度インスタンスを生成する
 * (Stripeの推奨パターン、サーバーレス関数インスタンスの使い回しを避ける)。
 */
export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Stripe client is not configured. Set STRIPE_SECRET_KEY as a server-only environment variable.",
    );
  }

  return new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });
}
