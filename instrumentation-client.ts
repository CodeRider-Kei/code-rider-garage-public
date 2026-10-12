import * as Sentry from "@sentry/nextjs";

// クライアント(ブラウザ)側のエラー監視。方針はsentry.server.config.tsと同じ。
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled:
    process.env.NODE_ENV === "production" && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
});
