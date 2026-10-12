import * as Sentry from "@sentry/nextjs";

// Next.jsの標準instrumentationフック。サーバー起動時に1度だけ呼ばれる。
// runtimeごとにSentryの初期化ファイルを出し分ける(Node/Edgeでインポートできる
// モジュールが異なるため)。
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Server Component・Route Handlerなどサーバー側で起きたエラーをSentryに送る。
export const onRequestError = Sentry.captureRequestError;
