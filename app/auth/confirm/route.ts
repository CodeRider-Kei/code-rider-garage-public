import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// next はURLパラメータ(=誰でも書き換え可能)なので、アプリ内の相対パスのみ許可する。
// 外部URL(https://evil.example)やプロトコル相対URL(//evil.example、
// ブラウザが / と同一視する /\evil.example、タブ等を挟んだ /\t/evil.example)を
// 許すと、認証成功直後に任意の外部サイトへ飛ばせるオープンリダイレクトになる。
// 文字列の前方一致ではなく、ブラウザと同じURLパーサーで解決した結果が
// 同一オリジンに留まるかで判定する。
function toSafeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith("/")) {
    return "/";
  }
  const base = "http://localhost";
  const resolved = new URL(next, base);
  if (resolved.origin !== base) {
    return "/";
  }
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = toSafeRedirectPath(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next);
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=No token hash or type`);
}
