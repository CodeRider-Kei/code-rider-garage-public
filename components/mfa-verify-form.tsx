"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export function MfaVerifyForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      const verifiedTotp = data?.totp?.[0];
      if (error || !verifiedTotp) {
        setError(
          "認証アプリの情報が見つかりませんでした。お手数ですが再度ログインしてください。",
        );
      } else {
        setFactorId(verifiedTotp.id);
      }
      setIsReady(true);
    });
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      setError("確認コードが正しくありません。もう一度お試しください。");
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">二段階認証</CardTitle>
          <CardDescription>
            認証アプリに表示されている確認コードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="code">確認コード</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isReady || !factorId}
              >
                {isLoading ? "確認中..." : "確認する"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
