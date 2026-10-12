import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin (Secret Key) クライアント。
 *
 * `import "server-only"` により、この関数をClient Componentから
 * importしようとするとビルドエラーになる(構成として強制される)。
 *
 * SUPABASE_SECRET_KEY は NEXT_PUBLIC_ を付けないサーバー専用の
 * 環境変数として `.env.local` / Netlify の環境変数に設定すること。
 * 通常の認証状態を扱う `@/lib/supabase/server` のクライアントとは異なり、
 * RLSを無視して管理者操作(ユーザー削除等)を行える強力な権限を持つため、
 * Server Action等の信頼できるサーバーコードからのみ呼び出すこと。
 *
 * サーバーレス関数インスタンスが使い回される環境を考慮し、
 * グローバル変数へキャッシュせず呼び出しごとに生成する。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Supabase admin client is not configured. Set SUPABASE_SECRET_KEY as a server-only environment variable.",
    );
  }

  return createSupabaseClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
