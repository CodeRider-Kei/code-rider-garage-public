"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { signInWithLockout } from "@/app/auth/login/actions";
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
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // 失敗回数のカウント・ロック判定はクライアント側の改ざんを防ぐため
      // Server Action(app/auth/login/actions.ts)側で行う。認証成功時は
      // このServer Action内でCookieにセッションが書き込まれる。
      const result = await signInWithLockout(email, password);

      if (result.status === "locked") {
        setError(
          "ログイン試行回数が上限に達したため、一時的にロックされています。しばらくしてから再度お試しいただくか、パスワードを再設定してください。",
        );
        return;
      }

      if (result.status === "invalid_credentials") {
        setError("メールアドレスまたはパスワードが正しくありません。");
        return;
      }

      if (result.status === "error") {
        setError("ログインに失敗しました。しばらくしてから再度お試しください。");
        return;
      }

      // MFAを有効化しているユーザーは、パスワード認証だけではまだaal2に
      // 達していないため、先にチャレンジ画面へ案内する(実際の強制は
      // lib/supabase/proxy.tsのミドルウェア側で行っているので、ここは
      // 無駄なリダイレクト往復を避けるためのUX上の分岐)。Server Action側で
      // Cookieに書き込まれたセッションを、ここで新規作成するブラウザ
      // クライアント(Cookieストレージ)がそのまま読み取る。
      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.nextLevel === "aal2" && aalData.currentLevel !== "aal2") {
        router.push("/auth/mfa-verify");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("ログインに失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">ログイン</CardTitle>
          <CardDescription>
            メールアドレスを入力してログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
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
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">パスワード</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    パスワードをお忘れですか?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "ログイン中..." : "ログイン"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              アカウントをお持ちでないですか?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                新規登録
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
