import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import { aggregateCategoryCost, aggregateMonthlyCost } from "@/lib/cost-analysis";
import { aggregateMonthlyDistance } from "@/lib/mileage-analysis";
import { calculateFuelEconomy } from "@/lib/fuel-economy";
import { INSURANCE_TYPE_LABEL, type InsuranceType } from "@/lib/insurance";
import { formatYen } from "@/lib/format";
import { elapsedMonthlyPaymentEntries, getLoanCostToDate, summarizeLoan } from "@/lib/loan-calculation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostAnalysis } from "@/components/cost-analysis";
import { MileageHistoryChart } from "@/components/mileage-history-chart";
import { FuelEconomyChart } from "@/components/fuel-economy-chart";
import { AnalysisPageSkeleton } from "@/components/skeletons";

async function AnalysisPage({
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

  const { data, error: motorcycleError } = await supabase
    .from("motorcycles")
    .select(
      "id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (motorcycleError) {
    console.error("[AnalysisPage] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
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

  // 整備・カスタム・保険・給油・ローンそれぞれの費用分析を、必要最小限の列だけで
  // サーバー側で算出する(全カラムをクライアントへ送らない。集計結果のみを各
  // コンポーネントへ渡す)。
  const [
    { data: maintenanceRows },
    { data: customPartRows },
    { data: insuranceRows },
    { data: fuelRows },
    { data: loanRows },
  ] = await Promise.all([
    supabase
      .from("maintenance_records")
      .select("maintenance_date, category, cost, mileage")
      .eq("motorcycle_id", motorcycle.id)
      .returns<
        { maintenance_date: string; category: string; cost: number | null; mileage: number | null }[]
      >(),
    supabase
      .from("custom_parts")
      .select("purchase_date, category, cost")
      .eq("motorcycle_id", motorcycle.id)
      .returns<{ purchase_date: string; category: string; cost: number | null }[]>(),
    supabase
      .from("insurance_policies")
      .select("insurance_type, premium_cost")
      .eq("motorcycle_id", motorcycle.id)
      .returns<{ insurance_type: InsuranceType; premium_cost: number | null }[]>(),
    supabase
      .from("fuel_records")
      .select("id, filled_on, mileage, liters, cost, is_full_tank")
      .eq("motorcycle_id", motorcycle.id)
      .returns<
        {
          id: string;
          filled_on: string;
          mileage: number | null;
          liters: number;
          cost: number | null;
          is_full_tank: boolean;
        }[]
      >(),
    supabase
      .from("loans")
      .select(
        "lender_name, principal, annual_interest_rate, monthly_payment, term_months, start_date, bonus_payment_amount, bonus_month_1, bonus_month_2",
      )
      .eq("motorcycle_id", motorcycle.id)
      .returns<
        {
          lender_name: string;
          principal: number;
          annual_interest_rate: number | null;
          monthly_payment: number | null;
          term_months: number;
          start_date: string;
          bonus_payment_amount: number | null;
          bonus_month_1: number | null;
          bonus_month_2: number | null;
        }[]
      >(),
  ]);

  const maintenanceRecords = maintenanceRows ?? [];
  const customParts = customPartRows ?? [];
  const insurancePolicies = insuranceRows ?? [];
  const fuelRecords = (fuelRows ?? []).map((r) => ({ ...r, liters: Number(r.liters) }));
  const loans = (loanRows ?? []).map((l) => ({
    ...l,
    annual_interest_rate: l.annual_interest_rate === null ? null : Number(l.annual_interest_rate),
  }));
  // 各ローンの「支払い済み累計額」(賞与払い分を含む、経過月数分の実際の支払額)を、
  // 他カテゴリと同じ「すでに発生した費用」として扱う(将来の返済予定は含めない)。
  const loanCostsSoFar = loans.map((loan) => {
    const summary = summarizeLoan(loan);
    return { loan, monthlyPayment: summary.monthlyPayment, costSoFar: getLoanCostToDate(loan) };
  });

  const maintenanceTotal = maintenanceRecords.reduce((sum, r) => sum + (r.cost ?? 0), 0);
  const customTotal = customParts.reduce((sum, p) => sum + (p.cost ?? 0), 0);
  const insuranceTotal = insurancePolicies.reduce((sum, p) => sum + (p.premium_cost ?? 0), 0);
  const fuelTotal = fuelRecords.reduce((sum, f) => sum + (f.cost ?? 0), 0);
  const loanTotal = loanCostsSoFar.reduce((sum, l) => sum + l.costSoFar, 0);

  // 全体タブ: 整備/カスタム/保険/給油/ローンのどれがどれだけの割合かを、既存の
  // カテゴリー別集計(lib/cost-analysis.ts aggregateCategoryCost)をソース名で
  // 流用して算出する。
  const sourceCategoryData = aggregateCategoryCost([
    ...maintenanceRecords.map((r) => ({ category: "整備", cost: r.cost })),
    ...customParts.map((p) => ({ category: "カスタム", cost: p.cost })),
    ...insurancePolicies.map((p) => ({ category: "保険", cost: p.premium_cost })),
    ...fuelRecords.map((f) => ({ category: "給油", cost: f.cost })),
    ...loanCostsSoFar.map((l) => ({ category: "ローン", cost: l.costSoFar })),
  ]);
  const hasAnyCostSource =
    maintenanceRecords.length > 0 ||
    customParts.length > 0 ||
    insurancePolicies.length > 0 ||
    fuelRecords.length > 0 ||
    loans.length > 0;

  const maintenanceMonthlyData = aggregateMonthlyCost(
    maintenanceRecords.map((r) => ({ date: r.maintenance_date, cost: r.cost })),
  );
  const maintenanceCategoryData = aggregateCategoryCost(maintenanceRecords);

  const customMonthlyData = aggregateMonthlyCost(
    customParts.map((p) => ({ date: p.purchase_date, cost: p.cost })),
  );
  const customCategoryData = aggregateCategoryCost(customParts);

  const insuranceCategoryData = aggregateCategoryCost(
    insurancePolicies.map((p) => ({
      category: INSURANCE_TYPE_LABEL[p.insurance_type],
      cost: p.premium_cost,
    })),
  );

  const fuelMonthlyData = aggregateMonthlyCost(
    fuelRecords.map((f) => ({ date: f.filled_on, cost: f.cost })),
  );
  // 給油記録にはカテゴリーの概念が無いため、代わりに「満タン/部分給油」の
  // 内訳を円グラフに使う(すでに持っているデータで意味のある軸になる)。
  const fuelCategoryData = aggregateCategoryCost(
    fuelRecords.map((f) => ({
      category: f.is_full_tank ? "満タン" : "部分給油",
      cost: f.cost,
    })),
  );
  const fuelEconomyPoints = calculateFuelEconomy(fuelRecords);

  const loanMonthlyData = aggregateMonthlyCost(
    loanCostsSoFar.flatMap(({ loan, monthlyPayment }) =>
      elapsedMonthlyPaymentEntries(loan, monthlyPayment),
    ),
  );
  // ローンにはカテゴリーの概念が無いため、代わりに借入先ごとの内訳を円グラフに
  // 使う(複数ローンがある場合に意味のある軸になる、給油の「満タン/部分給油」と同じ発想)。
  const loanCategoryData = aggregateCategoryCost(
    loanCostsSoFar.map((l) => ({ category: l.loan.lender_name, cost: l.costSoFar })),
  );

  // 専用の走行ログは持たないため、整備記録・給油記録に入力された走行距離+現在の
  // 走行距離を「記録点」として月別走行距離の目安を算出する(詳細はlib/mileage-analysis.ts)。
  const mileageReadings = maintenanceRecords
    .filter((r): r is typeof r & { mileage: number } => r.mileage !== null)
    .map((r) => ({ date: r.maintenance_date, mileage: r.mileage }));
  mileageReadings.push(
    ...fuelRecords
      .filter((f): f is typeof f & { mileage: number } => f.mileage !== null)
      .map((f) => ({ date: f.filled_on, mileage: f.mileage })),
  );
  mileageReadings.push({
    date: motorcycle.mileage_recorded_on,
    mileage: motorcycle.current_mileage,
  });
  const hasMileageData = new Set(mileageReadings.map((r) => r.date)).size >= 2;
  const monthlyDistanceData = aggregateMonthlyDistance(mileageReadings);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">{motorcycle.name} - 分析</h1>

      <div className="w-full grid gap-6 lg:grid-cols-2 lg:items-start">
        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">全体</TabsTrigger>
            <TabsTrigger value="maintenance">整備</TabsTrigger>
            <TabsTrigger value="custom">カスタム</TabsTrigger>
            <TabsTrigger value="insurance">保険</TabsTrigger>
            <TabsTrigger value="fuel">給油</TabsTrigger>
            <TabsTrigger value="loan">ローン</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="pt-4">
            <CostAnalysis
              title={`費用内訳(合計 ${formatYen(maintenanceTotal + customTotal + insuranceTotal + fuelTotal + loanTotal)})`}
              hasData={hasAnyCostSource}
              emptyMessage="整備記録・カスタムパーツ・保険・給油・ローンのいずれかを登録すると、ここに費用内訳が表示されます。"
              categoryData={sourceCategoryData}
            />
          </TabsContent>

          <TabsContent value="maintenance" className="pt-4">
            <CostAnalysis
              title="整備費用"
              costLabel="整備費用"
              hasData={maintenanceRecords.length > 0}
              emptyMessage="整備記録を登録すると、ここに費用の分析が表示されます。"
              monthlyData={maintenanceMonthlyData}
              categoryData={maintenanceCategoryData}
            />
          </TabsContent>

          <TabsContent value="custom" className="pt-4">
            <CostAnalysis
              title="カスタム費用"
              costLabel="カスタム費用"
              hasData={customParts.length > 0}
              emptyMessage="カスタムパーツを登録すると、ここに費用の分析が表示されます。"
              monthlyData={customMonthlyData}
              categoryData={customCategoryData}
            />
          </TabsContent>

          <TabsContent value="insurance" className="pt-4">
            <CostAnalysis
              title="保険料"
              hasData={insurancePolicies.length > 0}
              emptyMessage="保険を登録すると、ここに保険料の内訳が表示されます。"
              categoryData={insuranceCategoryData}
            />
          </TabsContent>

          <TabsContent value="fuel" className="pt-4 flex flex-col gap-4">
            <CostAnalysis
              title="給油費"
              costLabel="給油費"
              hasData={fuelRecords.length > 0}
              emptyMessage="給油記録を登録すると、ここに費用の分析が表示されます。"
              monthlyData={fuelMonthlyData}
              categoryData={fuelCategoryData}
            />
            <FuelEconomyChart points={fuelEconomyPoints} />
          </TabsContent>

          <TabsContent value="loan" className="pt-4">
            <CostAnalysis
              title="ローン返済額(支払い済み累計)"
              costLabel="返済額"
              hasData={loans.length > 0}
              emptyMessage="ローンを登録すると、ここに返済額の分析が表示されます。"
              monthlyData={loanMonthlyData}
              categoryData={loanCategoryData}
            />
          </TabsContent>
        </Tabs>

        <MileageHistoryChart
          hasData={hasMileageData}
          monthlyData={monthlyDistanceData}
        />
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

export default function MotorcycleAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      <Suspense fallback={<AnalysisPageSkeleton />}>
        <AnalysisPage params={params} />
      </Suspense>
    </div>
  );
}
