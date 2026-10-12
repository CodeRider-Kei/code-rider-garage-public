import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import type { Loan } from "@/lib/loan";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoanCard } from "@/components/loan-card";
import { ListPageSkeleton } from "@/components/skeletons";

async function LoansPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();

  if (userError || !userData?.claims) {
    redirect("/auth/login");
  }

  const userId = userData.claims.sub as string;

  // モーターサイクル所有権チェックとローン一覧は互いに独立したクエリなので、
  // motorcycle_idはルートパラメータのidをそのまま使って並列実行する
  // (loansテーブル側もRLSで所有権が担保されているため安全)。
  const [{ data, error: motorcycleError }, { data: loansData }] = await Promise.all([
    supabase
      .from("motorcycles")
      .select(
        "id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color",
      )
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("loans")
      .select(
        "id, lender_name, principal, annual_interest_rate, monthly_payment, term_months, start_date, bonus_payment_amount, bonus_month_1, bonus_month_2, note",
      )
      .eq("motorcycle_id", id)
      .order("start_date", { ascending: false })
      .returns<Loan[]>(),
  ]);

  if (motorcycleError) {
    console.error("[LoansPage] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
  }

  const motorcycle = data as Motorcycle | null;

  if (!motorcycle) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          バイクが見つかりませんでした。削除されたか、閲覧する権限がありません。
        </CardContent>
      </Card>
    );
  }

  const loans = (loansData ?? []).map((loan) => ({
    ...loan,
    annual_interest_rate:
      loan.annual_interest_rate === null ? null : Number(loan.annual_interest_rate),
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">{motorcycle.name} - ローン</h1>

      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">ローン</h2>
          <Button asChild size="sm">
            <Link href={`/motorcycles/${motorcycle.id}/loans/new`}>
              ＋ ローンを登録
            </Link>
          </Button>
        </div>

        {loans.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              まだローンが登録されていません。借入総額・期間・金利(または月々支払額)を入力すると、残高や利息を自動計算できます。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loans.map((loan) => (
              <LoanCard key={loan.id} loan={loan} />
            ))}
          </div>
        )}
      </div>

      <Link
        href={`/motorcycles/${motorcycle.id}`}
        className="text-sm text-center underline underline-offset-4"
      >
        バイク詳細に戻る
      </Link>
    </div>
  );
}

export default function MotorcycleLoansPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      <Suspense fallback={<ListPageSkeleton actions />}>
        <LoansPage params={params} />
      </Suspense>
    </div>
  );
}
