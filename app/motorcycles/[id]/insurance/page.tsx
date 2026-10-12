import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import { getTodayDateString } from "@/lib/maintenance-schedule";
import type { InsurancePolicy } from "@/lib/insurance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InsurancePolicyCard } from "@/components/insurance-policy-card";
import { InsuranceAffiliateAd } from "@/components/insurance-affiliate-ad";
import { ListPageSkeleton } from "@/components/skeletons";

async function InsuranceListPage({
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

  // 所有権チェックと保険一覧は互いに独立したクエリなので、motorcycle_idは
  // ルートパラメータのidをそのまま使って並列実行する
  // (insurance_policiesテーブル側もRLSで所有権が担保されているため安全)。
  const [{ data, error: motorcycleError }, { data: insurancePoliciesData }] =
    await Promise.all([
      supabase
        .from("motorcycles")
        .select(
          "id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color",
        )
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("insurance_policies")
        .select(
          "id, insurance_type, insurer_name, payment_frequency, premium_cost, period_start, period_end, note",
        )
        .eq("motorcycle_id", id)
        .order("period_end", { ascending: true })
        .returns<InsurancePolicy[]>(),
    ]);

  if (motorcycleError) {
    console.error("[InsuranceListPage] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
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

  const insurancePolicies = insurancePoliciesData ?? [];
  const today = getTodayDateString();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">{motorcycle.name} - 保険</h1>

      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">保険</h2>
          <Button asChild size="sm">
            <Link href={`/motorcycles/${motorcycle.id}/insurance/new`}>
              ＋ 保険を登録
            </Link>
          </Button>
        </div>

        {insurancePolicies.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              まだ保険情報が登録されていません。自賠責保険・任意保険の更新期限をここで管理できます。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {insurancePolicies.map((policy) => (
              <InsurancePolicyCard
                key={policy.id}
                policy={policy}
                todayDateStr={today}
              />
            ))}
          </div>
        )}

        <InsuranceAffiliateAd />
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

export default function MotorcycleInsurancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      <Suspense fallback={<ListPageSkeleton badge actions />}>
        <InsuranceListPage params={params} />
      </Suspense>
    </div>
  );
}
