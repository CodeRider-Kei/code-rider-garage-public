import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// cacheComponents(Partial Prerendering等をまとめて有効化するNext.js 16の
// 実験的フラグ)は無効化している。このリポジトリは "use cache" ディレクティブ・
// cacheLife・cacheTagのいずれも使っておらず、有効化していると開発時に
// 無関係なページでも「Could not validate `instant` ... this is a bug in
// Next.js」という内部エラーがコンソールに出続ける(本番ビルド自体は通るが、
// dev体験を損なう)。使う予定ができたら再度検討する。
//
// env.SITE_URL: アプリ自身の絶対URL(lib/site-url.ts 参照)。Netlifyの URL /
// DEPLOY_PRIME_URL はビルド時には確実に存在するが、実行時(Functions内)に
// 参照できる保証がないため、ビルド時にバンドルへ埋め込む。公開URLなので
// クライアントバンドルに含まれても問題ない。
const nextConfig: NextConfig = {
  env: {
    SITE_URL:
      process.env.URL ?? process.env.DEPLOY_PRIME_URL ?? "http://localhost:3000",
  },
};

// Sentryプロジェクトが未作成(env未設定)の間はそのままのnextConfigを使う。
// org/project/DSNが揃って初めてwithSentryConfigでラップし、ソースマップ
// アップロード等のビルド時プラグインを有効化する(ローカル開発・このリポジトリの
// CIをSentry未設定のままでも壊さないための分岐)。
const sentryEnabled = Boolean(
  process.env.NEXT_PUBLIC_SENTRY_DSN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT,
);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : nextConfig;
