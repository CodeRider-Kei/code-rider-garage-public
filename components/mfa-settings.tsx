"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Factor } from "@supabase/supabase-js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type EnrollmentState = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function MfaSettings() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshFactors = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  };

  useEffect(() => {
    refreshFactors();
  }, []);

  const startEnrollment = async () => {
    setError(null);
    setIsLoading(true);
    const supabase = createClient();

    // listFactors()のdata.totpは検証済み(verified)のファクターしか含まず、
    // QRコード表示に失敗した等で確認が完了しなかった未検証(unverified)の
    // ファクターはdata.allにのみ残り続ける。画面上は「未登録」に見えたまま
    // 裏で蓄積し、件数の上限に達するとenroll()が失敗するため、新規登録の
    // たびに未検証分を掃除してから開始する。
    const { data: existingFactors } = await supabase.auth.mfa.listFactors();
    const staleFactors = (existingFactors?.all ?? []).filter(
      (factor) => factor.status === "unverified",
    );
    for (const stale of staleFactors) {
      await supabase.auth.mfa.unenroll({ factorId: stale.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });
    setIsLoading(false);

    if (error || !data) {
      console.error("[startEnrollment] mfa.enroll failed:", error?.name, error?.code);
      setError("認証アプリの登録開始に失敗しました。しばらくしてから再度お試しください。");
      return;
    }

    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
  };

  const cancelEnrollment = async () => {
    if (enrollment) {
      const supabase = createClient();
      // 確認前に離脱した場合、未検証のファクターが残り続けないよう解除しておく。
      await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
    }
    setEnrollment(null);
    setCode("");
    setError(null);
  };

  const confirmEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;

    setError(null);
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code,
    });
    setIsLoading(false);

    if (error) {
      setError("確認コードが正しくありません。もう一度お試しください。");
      return;
    }

    setEnrollment(null);
    setCode("");
    await refreshFactors();
  };

  const unenrollFactor = async (factorId: string) => {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    if (error) {
      setError("解除に失敗しました。しばらくしてから再度お試しください。");
      return;
    }

    await refreshFactors();
  };

  if (enrollment) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          認証アプリ(Google Authenticator、Microsoft Authenticator等)でQRコードを読み取るか、下のキーを手動で入力してください。
        </p>
        {/* このSDKバージョンではdata.totp.qr_codeが「data:image/svg+xml;...」
            から始まる完成済みのdata URIとして返るため、そのままsrcに使う
            (自前でdata:プレフィックスを付け足したりencodeURIComponentを
            かけたりすると二重エンコードになり壊れる)。 */}
        {/* QR自体には背景色が含まれておらず、ページ側のダークモード背景が
            透けて黒モジュールと重なり認証アプリが読み取れなくなるため、
            テーマに関わらず常に白背景+余白(クワイエットゾーン)を持たせる。 */}
        <div className="mx-auto w-fit rounded-md bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qrCode}
            alt="認証アプリ登録用QRコード"
            width={200}
            height={200}
          />
        </div>
        <p className="text-center font-mono text-xs text-muted-foreground break-all">
          {enrollment.secret}
        </p>
        <form onSubmit={confirmEnrollment} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="mfa_enroll_code">確認コード</Label>
            <Input
              id="mfa_enroll_code"
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
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={cancelEnrollment}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "確認中..." : "有効化する"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {factors === null ? (
        <Skeleton className="h-4 w-40" />
      ) : factors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          まだ認証アプリが登録されていません。
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {factors.map((factor) => (
            <li
              key={factor.id}
              className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
            >
              <span>{factor.friendly_name || "認証アプリ"}</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm">
                    解除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>この認証アプリを解除しますか?</AlertDialogTitle>
                    <AlertDialogDescription>
                      解除すると、次回ログイン時にこの認証アプリでの確認は不要になります。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction
                      className={cn(buttonVariants({ variant: "destructive" }))}
                      onClick={() => unenrollFactor(factor.id)}
                    >
                      解除する
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        バックアップのため、複数台の端末で認証アプリを登録しておくことをおすすめします。すべての認証アプリを紛失した場合は、お問い合わせ先までご連絡ください。
      </p>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <Button type="button" onClick={startEnrollment} disabled={isLoading}>
        {isLoading ? "準備中..." : "認証アプリを追加"}
      </Button>
    </div>
  );
}
