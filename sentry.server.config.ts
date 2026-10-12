import * as Sentry from "@sentry/nextjs";

// 無料枠を温存するため、本番環境でのみ有効化する(ローカル開発中のノイズを
// Sentryに送らない)。DSN未設定(=Sentryプロジェクト未作成)の間はSentry SDK
// 自体は読み込まれるが送信は行われない。
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled:
    process.env.NODE_ENV === "production" && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
});
