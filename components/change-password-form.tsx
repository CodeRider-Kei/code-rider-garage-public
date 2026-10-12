"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { changePassword } from "@/app/account/actions";
import type { ChangePasswordFormState } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ChangePasswordFormState = {};

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePassword,
    initialState,
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 変更成功後は入力欄をクリアする。
  useEffect(() => {
    if (state.success) {
      setPassword("");
      setConfirmPassword("");
    }
  }, [state]);

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="password">新しいパスワード</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">新しいパスワード(確認)</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {mismatch && (
          <p role="alert" className="text-sm text-red-500">パスワードが一致しません。</p>
        )}
      </div>
      {state.error && <p role="alert" className="text-sm text-red-500">{state.error}</p>}
      {state.success && !state.requiresRelogin && (
        <p className="text-sm text-green-600 dark:text-green-500">
          パスワードを変更しました。
        </p>
      )}
      {state.success && state.requiresRelogin && (
        <p className="text-sm text-amber-600 dark:text-amber-500">
          パスワードを変更しました。セッションの有効期限が切れているため、お手数ですが
          <Link href="/auth/login" className="underline underline-offset-4">
            再度ログイン
          </Link>
          してください。
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={isPending || mismatch}
      >
        {isPending ? "変更中..." : "パスワードを変更する"}
      </Button>
    </form>
  );
}
