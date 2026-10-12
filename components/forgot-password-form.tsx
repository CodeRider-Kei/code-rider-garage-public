"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch {
      setError("送信に失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">メールをご確認ください</CardTitle>
            <CardDescription>パスワード再設定の案内を送信しました</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              入力されたメールアドレスが登録済みの場合、パスワード再設定用のメールが届きます。
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">パスワードを再設定</CardTitle>
            <CardDescription>
              登録済みのメールアドレスを入力すると、再設定用のリンクをお送りします
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "送信中..." : "再設定メールを送信"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                アカウントをお持ちですか?{" "}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  ログイン
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
