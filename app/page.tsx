import Link from "next/link";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/external-link";
import { BLOG_NAME, BLOG_URL, SERVICE_NAME, X_HANDLE, X_URL } from "@/lib/site-config";
import { Skeleton } from "@/components/ui/skeleton";

async function HomeCTA() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) {
    return null;
  }

  return (
    <Button asChild size="lg">
      <Link href="/dashboard">ダッシュボードへ</Link>
    </Button>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 flex flex-col gap-8 max-w-5xl p-5 items-center text-center">
        <h1 className="text-2xl font-bold whitespace-nowrap">{SERVICE_NAME}</h1>
        <p className="text-muted-foreground max-w-md text-balance">
          愛車の整備履歴をかんたんに記録・管理できます。
        </p>
        <Suspense fallback={<Skeleton className="h-11 w-40 rounded-md" />}>
          <HomeCTA />
        </Suspense>

        <div className="mt-4 flex flex-col items-center gap-2 text-xs text-muted-foreground max-w-sm sm:max-w-md md:max-w-lg">
          <p className="text-balance">
            <span className="whitespace-nowrap">{SERVICE_NAME}</span>
            は、バイクの整備記録や維持費を簡単に管理できるサービスです。
          </p>
          <p className="text-balance">
            オイル交換、タイヤ交換、点検費用などを記録して、愛車との歴史を残しましょう。
          </p>
          <p className="text-balance">
            「
            <ExternalLink href={BLOG_URL} className="text-foreground/80">
              {BLOG_NAME}
            </ExternalLink>
            」が運営するサービスです。
          </p>
          <p className="text-balance">
            <span className="whitespace-nowrap">{SERVICE_NAME}</span>
            は現在β版です。ご意見・不具合報告をお待ちしています。
          </p>
          <ExternalLink href={X_URL} className="text-foreground/80">
            X: {X_HANDLE}
          </ExternalLink>
        </div>
      </div>
    </main>
  );
}
