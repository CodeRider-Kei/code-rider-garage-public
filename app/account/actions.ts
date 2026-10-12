"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChangePasswordFormState } from "@/lib/account";

export async function changePassword(
  _prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();

  if (userError || !userData?.claims) {
    redirect("/auth/login");
  }

  // 確認用も含め、パスワードはtrimしない(前後の空白も入力値として扱う)。
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || !confirmPassword) {
    return { error: "新しいパスワードを入力してください。" };
  }

  if (password !== confirmPassword) {
    return { error: "確認用パスワードが一致しません。" };
  }

  // 現在ログイン中のセッション(Cookie)に対して更新するため、
  // クライアントからuserIdを受け取る必要はなく、管理者用Secret Keyも使わない。
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    // パスワードの値そのものは含まれないエラーコード/名前のみを記録する。
    console.error("[changePassword] updateUser failed:", error.name, error.code);

    if (
      error.name === "AuthSessionMissingError" ||
      error.code === "session_not_found"
    ) {
      redirect("/auth/login");
    }

    if (error.code === "weak_password") {
      return {
        error:
          "パスワードの強度が不足しています。より長く複雑なパスワードを設定してください。",
      };
    }

    if (error.code === "same_password") {
      return {
        error: "現在のパスワードと同じです。別のパスワードを設定してください。",
      };
    }

    return {
      error: "パスワードの変更に失敗しました。しばらくしてから再度お試しください。",
    };
  }

  // 変更後もログインセッションが有効なままかを確認し、無効なら再ログインを案内する。
  const { data: recheckData, error: recheckError } =
    await supabase.auth.getClaims();

  if (recheckError || !recheckData?.claims) {
    return { success: true, requiresRelogin: true };
  }

  return { success: true };
}

export async function deleteAccount(): Promise<void> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();
  const user = userData?.claims;

  if (userError || !user) {
    redirect("/auth/login");
  }

  // 削除対象のIDはクライアントから受け取らず、サーバー側の認証情報
  // (getClaims())から取得した本人のIDのみを使う。
  const userId = user.sub as string;

  // createAdminClient()はSUPABASE_SECRET_KEY未設定時に例外を投げる。
  // deleteUser()自体のネットワーク例外も含め、ここで捕捉して
  // 500エラー画面ではなく汎用エラーとして扱う。redirect()は内部的に
  // 例外を投げて処理を中断する仕組みのため、try節の中では呼ばない
  // (catchで誤って握りつぶさないようにするため)。
  let deletionSucceeded = false;
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) {
      // Secret Keyや環境変数の値はここに含まれない(AuthErrorの説明文のみ)
      console.error("[deleteAccount] admin.deleteUser failed:", error.message);
    } else {
      deletionSucceeded = true;
    }
  } catch {
    // Secret Key未設定・ネットワーク例外等。詳細な例外内容(環境変数の値を
    // 含みうる可能性を排除できない)はログに出さず、固定の汎用メッセージのみ記録する。
    console.error("[deleteAccount] admin client error during account deletion");
  }

  if (!deletionSucceeded) {
    redirect("/account?error=1");
  }

  // アカウント削除後は必ずログアウト状態にする。signOut()はネットワーク上の
  // ログアウト処理(GoTrueへの/logout呼び出し)が失敗した場合でも、
  // ローカルのセッション(Cookie)は@supabase/ssrのstorageアダプター経由で
  // 削除される(auth-jsの_signOut実装で確認済み)。念のため例外も捕捉し、
  // Cookie破棄の試み自体は必ず行われるようにする。
  try {
    await supabase.auth.signOut();
  } catch {
    console.error("[deleteAccount] signOut failed after account deletion");
  }

  redirect("/");
}
