import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { formatYen } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupportCheckoutSession } from "./actions";
import { FormCardSkeleton } from "@/components/skeletons";

const SUPPORT_AMOUNTS_YEN = [300, 500, 1000] as const;

async function SupportInfo({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();

  if (userError || !userData?.claims) {
    redirect("/auth/login");
  }

  const params = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">応援する</CardTitle>
        <CardDescription>
          Code Rider Garageの開発を応援いただけます。任意の金額でご支援いただけると励みになります。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {params?.success === "1" && (
          <p className="text-sm text-emerald-600">
            ご支援ありがとうございました。
          </p>
        )}
        {params?.error && (
          <p className="text-sm text-red-500">
            応援の手続きに失敗しました。しばらくしてから再度お試しください。
          </p>
        )}
        <div className="flex gap-2">
          {SUPPORT_AMOUNTS_YEN.map((amount) => (
            <form
              key={amount}
              action={createSupportCheckoutSession.bind(null, amount)}
              className="flex-1"
            >
              <Button type="submit" variant="outline" className="w-full">
                {formatYen(amount)}
              </Button>
            </form>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  return (
    <div className="w-full max-w-sm md:max-w-md mx-auto flex flex-col gap-6">
      <Suspense fallback={<FormCardSkeleton fields={1} />}>
        <SupportInfo searchParams={searchParams} />
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
