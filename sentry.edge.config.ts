import * as Sentry from "@sentry/nextjs";

// proxy.ts(旧middleware)はEdge runtimeで動くため、そちら用の初期化を分けている。
// 設計方針はsentry.server.config.tsと同じ(本番のみ有効・DSN未設定なら送信なし)。
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled:
    process.env.NODE_ENV === "production" && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
});
