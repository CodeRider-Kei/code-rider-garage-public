import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { ChangePasswordForm } from "@/components/change-password-form";
import { MfaSettings } from "@/components/mfa-settings";
import { AccountPageSkeleton } from "@/components/skeletons";

async function AccountInfo({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();

  if (userError || !userData?.claims) {
    redirect("/auth/login");
  }

  const email = userData.claims.email as string | undefined;
  const params = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">アカウント設定</CardTitle>
          <CardDescription>{email}</CardDescription>
        </CardHeader>
      </Card>

      {params?.error && (
        <p className="text-sm text-red-500 text-center">
          退会処理に失敗しました。しばらくしてから再度お試しください。
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">パスワード変更</CardTitle>
          <CardDescription>
            ログイン用の新しいパスワードを設定します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">二段階認証</CardTitle>
          <CardDescription>
            ログイン時に認証アプリの確認コードを追加で求めるようにします(任意)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MfaSettings />
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">退会</CardTitle>
          <CardDescription>
            アカウントを削除すると、登録したすべてのバイク情報と整備記録が完全に削除され、元に戻すことはできません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="w-full max-w-sm md:max-w-md mx-auto flex flex-col gap-6">
      <Suspense fallback={<AccountPageSkeleton />}>
        <AccountInfo searchParams={searchParams} />
      </Suspense>
      <Link
        href="/dashboard"
        className="text-sm text-center underline underline-offset-4"
      >
        ダッシュボードに戻る
      </Link>
    </div>
  );
}
