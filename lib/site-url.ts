function withProtocol(url: string) {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

// アプリ自身の絶対URL(末尾スラッシュなし)。パスワード再設定メールの
// redirectTo やStripe Checkoutの success_url 等、外部に渡すURLの組み立てに使う。
//
// リクエストの Host / X-Forwarded-Host ヘッダーはクライアントが偽装できるため
// 使わない(偽装されると再設定リンクが攻撃者のドメインに向き、トークンを
// 盗まれる恐れがある)。値は next.config.ts の env でビルド時に埋め込まれる
// (Netlifyの URL → DEPLOY_PRIME_URL → ローカルの順に解決)。
export const SITE_URL = withProtocol(
  process.env.SITE_URL || "http://localhost:3000",
).replace(/\/+$/, "");
