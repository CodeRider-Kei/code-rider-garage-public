import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { FREE_MOTORCYCLE_LIMIT, type Motorcycle } from "@/lib/motorcycle";
import { formatMaintenanceDate } from "@/lib/maintenance-record";
import { formatYen } from "@/lib/format";
import { getLoanCostToDate } from "@/lib/loan-calculation";
import { MotorcycleTypeIcon } from "@/components/motorcycle-type-icon";
import { CostBreakdownDonut } from "@/components/cost-breakdown-donut";
import { QuickMileageUpdateButton } from "@/components/quick-mileage-update-button";
import { updateMotorcycleMileage } from "@/app/motorcycles/[id]/mileage/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/skeletons";

type MotorcycleWithRecords = Motorcycle & {
  maintenance_records: {
    maintenance_date: string;
    category: string;
    cost: number | null;
  }[];
  custom_parts: { cost: number | null }[];
  insurance_policies: { premium_cost: number | null }[];
  fuel_records: { cost: number | null }[];
  loans: {
    principal: number;
    annual_interest_rate: number | null;
    monthly_payment: number | null;
    term_months: number;
    start_date: string;
    bonus_payment_amount: number | null;
    bonus_month_1: number | null;
    bonus_month_2: number | null;
  }[];
};

async function MotorcycleList() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();

  if (userError || !userData?.claims) {
    redirect("/auth/login");
  }

  const userId = userData.claims.sub as string;

  // maintenance_records/custom_parts/insurance_policies/fuel_records はcostのみを含む
  // 最小限の列で全件を埋め込み取得し、「最新の整備」と「費用の合計・内訳」を
  // サーバー側(この場でJSレデュース)で算出する。クエリは1回のまま(N+1を避ける)。
  // loansは残高計算に元金・期間等が必要なため、cost列だけでは済まず該当列を全部取得する。
  const { data: motorcycles, error: motorcyclesError } = await supabase
    .from("motorcycles")
    .select(
      "id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color, maintenance_records(maintenance_date, category, cost), custom_parts(cost), insurance_policies(premium_cost), fuel_records(cost), loans(principal, annual_interest_rate, monthly_payment, term_months, start_date, bonus_payment_amount, bonus_month_1, bonus_month_2)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("maintenance_date", {
      referencedTable: "maintenance_records",
      ascending: false,
    })
    .returns<MotorcycleWithRecords[]>();

  if (motorcyclesError) {
    console.error("[MotorcycleList] motorcycles fetch failed:", motorcyclesError.code, motorcyclesError.message);
  }

  const canRegisterMore = (motorcycles?.length ?? 0) < FREE_MOTORCYCLE_LIMIT;

  const header = (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-2xl font-bold">マイバイク</h1>
      {canRegisterMore && (
        <Button asChild size="sm">
          <Link href="/motorcycles/new">＋ バイクを登録</Link>
        </Button>
      )}
    </div>
  );

  if (!motorcycles || motorcycles.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            まだバイクが登録されていません。「＋ バイクを登録」から最初の1台を登録しましょう。
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="grid gap-4 lg:grid-cols-2">
        {motorcycles.map((motorcycle) => {
        const records = motorcycle.maintenance_records;
        const latest = records[0];
        const maintenanceCost = records.reduce(
          (sum, record) => sum + (record.cost ?? 0),
          0,
        );
        const customCost = motorcycle.custom_parts.reduce(
          (sum, part) => sum + (part.cost ?? 0),
          0,
        );
        const insuranceCost = motorcycle.insurance_policies.reduce(
          (sum, policy) => sum + (policy.premium_cost ?? 0),
          0,
        );
        const fuelCost = motorcycle.fuel_records.reduce(
          (sum, record) => sum + (record.cost ?? 0),
          0,
        );
        const loanCost = motorcycle.loans.reduce((sum, loan) => {
          const normalizedLoan = {
            ...loan,
            annual_interest_rate:
              loan.annual_interest_rate === null ? null : Number(loan.annual_interest_rate),
          };
          return sum + getLoanCostToDate(normalizedLoan);
        }, 0);
        const totalCost =
          maintenanceCost + customCost + insuranceCost + fuelCost + loanCost;

        return (
          <Card key={motorcycle.id} className="transition-colors hover:bg-accent/50">
            <Link href={`/motorcycles/${motorcycle.id}`}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {motorcycle.bike_type && (
                    <MotorcycleTypeIcon
                      bikeType={motorcycle.bike_type}
                      iconColor={motorcycle.icon_color}
                      size={20}
                    />
                  )}
                  <CardTitle>{motorcycle.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 flex-col gap-1 text-sm">
                  {(motorcycle.manufacturer || motorcycle.model) && (
                    <p className="text-muted-foreground">
                      {[motorcycle.manufacturer, motorcycle.model]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  )}
                  {motorcycle.displacement_cc !== null && (
                    <p className="text-muted-foreground">
                      排気量: {motorcycle.displacement_cc.toLocaleString("ja-JP")} cc
                    </p>
                  )}
                  <p>
                    現在の走行距離: {motorcycle.current_mileage.toLocaleString("ja-JP")} km
                    <span className="text-muted-foreground">
                      ({formatMaintenanceDate(motorcycle.mileage_recorded_on)}時点)
                    </span>
                  </p>
                  {latest && (
                    <p className="text-muted-foreground">
                      最新の整備: {formatMaintenanceDate(latest.maintenance_date)} (
                      {latest.category})
                    </p>
                  )}
                </div>
                {totalCost > 0 && (
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                    <CostBreakdownDonut
                      slices={[
                        { label: "整備", value: maintenanceCost, color: "hsl(var(--chart-1))" },
                        { label: "カスタム", value: customCost, color: "hsl(var(--chart-2))" },
                        { label: "保険", value: insuranceCost, color: "hsl(var(--chart-3))" },
                        { label: "給油", value: fuelCost, color: "hsl(var(--chart-4))" },
                        { label: "ローン", value: loanCost, color: "hsl(var(--chart-5))" },
                      ]}
                    />
                    <div className="text-sm sm:text-right">
                      <p className="font-medium">
                        費用の合計: {formatYen(totalCost)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        整備 {Math.round((maintenanceCost / totalCost) * 100)}%・
                        カスタム {Math.round((customCost / totalCost) * 100)}%・
                        保険 {Math.round((insuranceCost / totalCost) * 100)}%・
                        給油 {Math.round((fuelCost / totalCost) * 100)}%・
                        ローン {Math.round((loanCost / totalCost) * 100)}%
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Link>
            <CardContent className="pt-0">
              <QuickMileageUpdateButton
                currentMileage={motorcycle.current_mileage}
                mileageRecordedOn={motorcycle.mileage_recorded_on}
                action={updateMotorcycleMileage.bind(null, motorcycle.id, "/dashboard")}
              />
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <MotorcycleList />
      </Suspense>
    </div>
  );
}
