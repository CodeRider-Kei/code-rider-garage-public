"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site-url";

// 5回連続でパスワードを間違えたら15分間ロックする。ロック中の
// パスワード再設定メールは1時間に1回までに絞り、繰り返しロックさせて
// メールを大量送信させる嫌がらせ(メール爆撃)を防ぐ。
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const RESET_EMAIL_THROTTLE_MS = 60 * 60 * 1000;

export type LoginResult =
  | { status: "success" }
  | { status: "locked" }
  | { status: "invalid_credentials" }
  | { status: "error" };

export async function signInWithLockout(
  email: string,
  password: string,
): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return { status: "invalid_credentials" };
  }

  const admin = createAdminClient();
  const nowMs = Date.now();

  const { data: lockout } = await admin
    .from("login_lockouts")
    .select("failed_attempts, locked_until, last_reset_email_sent_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  // ロック中はSupabase Authへの実際の認証試行すら行わない。
  if (lockout?.locked_until && new Date(lockout.locked_until).getTime() > nowMs) {
    return { status: "locked" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (!error) {
    if (lockout) {
      await admin.from("login_lockouts").delete().eq("email", normalizedEmail);
    }
    return { status: "success" };
  }

  // login-form.tsx の既存判定と同じ基準で「資格情報誤り」を判定する。
  // それ以外のエラー(ネットワーク障害等)は失敗回数としてカウントしない。
  if (!error.message.includes("Invalid login credentials")) {
    console.error("[signInWithLockout] signInWithPassword failed:", error.name, error.code);
    return { status: "error" };
  }

  const nextAttempts = (lockout?.failed_attempts ?? 0) + 1;
  const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;

  let nextResetEmailSentAt = lockout?.last_reset_email_sent_at ?? null;
  let sendResetEmail = false;

  if (shouldLock) {
    const lastSentMs = lockout?.last_reset_email_sent_at
      ? new Date(lockout.last_reset_email_sent_at).getTime()
      : null;
    if (lastSentMs === null || nowMs - lastSentMs > RESET_EMAIL_THROTTLE_MS) {
      sendResetEmail = true;
      nextResetEmailSentAt = new Date(nowMs).toISOString();
    }
  }

  const { error: upsertError } = await admin.from("login_lockouts").upsert(
    {
      email: normalizedEmail,
      failed_attempts: nextAttempts,
      locked_until: shouldLock
        ? new Date(nowMs + LOCKOUT_DURATION_MS).toISOString()
        : null,
      last_failed_at: new Date(nowMs).toISOString(),
      last_reset_email_sent_at: nextResetEmailSentAt,
    },
    { onConflict: "email" },
  );

  if (upsertError) {
    console.error("[signInWithLockout] login_lockouts upsert failed:", upsertError.message);
  }

  if (sendResetEmail) {
    // redirectToはリクエストヘッダー由来にしない(lib/site-url.ts 参照)。
    // このメールは第三者が被害者のメールアドレスで失敗を重ねることでも
    // 送信させられるため、リンク先を偽装されるとアカウント乗っ取りに直結する。
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo: `${SITE_URL}/auth/update-password` },
    );
    if (resetError) {
      console.error("[signInWithLockout] resetPasswordForEmail failed:", resetError.name, resetError.code);
    }
  }

  return shouldLock ? { status: "locked" } : { status: "invalid_credentials" };
}
