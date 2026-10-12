import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import { formatMaintenanceDate } from "@/lib/maintenance-record";
import { formatYen } from "@/lib/format";
import {
  getDueStatus,
  getMileageDueStatus,
  getTodayDateString,
  type DueStatus,
  type MaintenanceSchedule,
} from "@/lib/maintenance-schedule";
import type { InsurancePolicy } from "@/lib/insurance";
import { getLoanCostToDate } from "@/lib/loan-calculation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteMotorcycleButton } from "@/components/delete-motorcycle-button";
import { QuickMileageUpdateButton } from "@/components/quick-mileage-update-button";
import { updateMotorcycleMileage } from "./mileage/actions";
import { MaintenanceScheduleCard } from "@/components/maintenance-schedule-card";
import { InsurancePolicyCard } from "@/components/insurance-policy-card";
import {
  BIKE_TYPE_LABEL,
  MotorcycleTypeIcon,
} from "@/components/motorcycle-type-icon";
import { ChartPie, Fuel, Landmark, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { MotorcycleDetailSkeleton } from "@/components/skeletons";

const NEAR_DUE_ITEM_LIMIT = 3;

async function MotorcycleDetail({
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
    console.error("[MotorcycleDetail] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
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

  // 費用の合計(整備・カスタム・保険・給油・ローンの全ソース)は、ダッシュボードと
  // 同じ考え方でcost列のみの軽量クエリで算出する(保険はこの下で近日期限の判定にも
  // 使う全件取得の結果をそのまま流用する。ローンは残高計算に元金・期間等が
  // 必要なため、cost列だけでは済まず該当列を全部取得する)。
  const [
    { data: maintenanceCostRows },
    { count: recordCount },
    { data: customPartsData },
    { data: fuelCostRows },
    { count: fuelRecordCount },
    { data: loansData },
    { data: schedulesData },
    { data: insurancePoliciesData },
  ] = await Promise.all([
    supabase
      .from("maintenance_records")
      .select("cost")
      .eq("motorcycle_id", motorcycle.id)
      .returns<{ cost: number | null }[]>(),
    supabase
      .from("maintenance_records")
      .select("id", { count: "exact", head: true })
      .eq("motorcycle_id", motorcycle.id),
    supabase
      .from("custom_parts")
      .select("cost")
      .eq("motorcycle_id", motorcycle.id)
      .returns<{ cost: number | null }[]>(),
    supabase
      .from("fuel_records")
      .select("cost")
      .eq("motorcycle_id", motorcycle.id)
      .returns<{ cost: number | null }[]>(),
    supabase
      .from("fuel_records")
      .select("id", { count: "exact", head: true })
      .eq("motorcycle_id", motorcycle.id),
    supabase
      .from("loans")
      .select(
        "principal, annual_interest_rate, monthly_payment, term_months, start_date, bonus_payment_amount, bonus_month_1, bonus_month_2",
      )
      .eq("motorcycle_id", motorcycle.id)
      .returns<
        {
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
    supabase
      .from("maintenance_schedules")
      .select(
        "id, cycle_setting_id, item_name, category, next_due_date, next_due_mileage, distance_interval_km, note",
      )
      .eq("motorcycle_id", motorcycle.id)
      .returns<MaintenanceSchedule[]>(),
    supabase
      .from("insurance_policies")
      .select(
        "id, insurance_type, insurer_name, payment_frequency, premium_cost, period_start, period_end, note",
      )
      .eq("motorcycle_id", motorcycle.id)
      .order("period_end", { ascending: true })
      .returns<InsurancePolicy[]>(),
  ]);

  const maintenanceCost = (maintenanceCostRows ?? []).reduce(
    (sum, row) => sum + (row.cost ?? 0),
    0,
  );
  const customParts = customPartsData ?? [];
  const customCost = customParts.reduce((sum, row) => sum + (row.cost ?? 0), 0);
  const customPartCount = customParts.length;
  const fuelCost = (fuelCostRows ?? []).reduce(
    (sum, row) => sum + (row.cost ?? 0),
    0,
  );
  const loans = (loansData ?? []).map((loan) => ({
    ...loan,
    annual_interest_rate:
      loan.annual_interest_rate === null ? null : Number(loan.annual_interest_rate),
  }));
  const loanCost = loans.reduce((sum, loan) => sum + getLoanCostToDate(loan), 0);

  const insurancePolicies = insurancePoliciesData ?? [];
  const insuranceCost = insurancePolicies.reduce(
    (sum, policy) => sum + (policy.premium_cost ?? 0),
    0,
  );
  const totalCost = maintenanceCost + customCost + insuranceCost + fuelCost + loanCost;

  const today = getTodayDateString();

  const STATUS_RANK: Record<DueStatus, number> = { overdue: 0, due_soon: 1, ok: 2 };
  const nearDueSchedules = (schedulesData ?? [])
    .map((schedule) => {
      const dateStatus = schedule.next_due_date
        ? getDueStatus(schedule.next_due_date, today)
        : null;
      const mileageStatus =
        schedule.next_due_mileage !== null && schedule.distance_interval_km !== null
          ? getMileageDueStatus(
              schedule.next_due_mileage,
              schedule.distance_interval_km,
              motorcycle.current_mileage,
            )
          : null;
      const statuses = [dateStatus, mileageStatus].filter(
        (s): s is DueStatus => s !== null,
      );
      const worst = statuses.sort((a, b) => STATUS_RANK[a] - STATUS_RANK[b])[0] ?? null;
      return { schedule, worst };
    })
    .filter((s): s is { schedule: MaintenanceSchedule; worst: DueStatus } =>
      s.worst === "overdue" || s.worst === "due_soon",
    )
    .sort((a, b) => STATUS_RANK[a.worst] - STATUS_RANK[b.worst]);

  const visibleNearDueSchedules = nearDueSchedules.slice(0, NEAR_DUE_ITEM_LIMIT);
  const hasMoreNearDueSchedules = nearDueSchedules.length > NEAR_DUE_ITEM_LIMIT;

  // 保険も整備予定と同じ考え方で、更新期限(period_end)が近い/超過しているものだけ
  // 概要ページに表示する。
  const nearDueInsurancePolicies = insurancePolicies
    .map((policy) => ({ policy, status: getDueStatus(policy.period_end, today) }))
    .filter(
      (p): p is { policy: InsurancePolicy; status: "overdue" | "due_soon" } =>
        p.status === "overdue" || p.status === "due_soon",
    )
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);

  const visibleNearDueInsurancePolicies = nearDueInsurancePolicies.slice(
    0,
    NEAR_DUE_ITEM_LIMIT,
  );
  const hasMoreNearDueInsurancePolicies =
    nearDueInsurancePolicies.length > NEAR_DUE_ITEM_LIMIT;

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {motorcycle.bike_type && (
                <MotorcycleTypeIcon
                  bikeType={motorcycle.bike_type}
                  iconColor={motorcycle.icon_color}
                  size={24}
                />
              )}
              <CardTitle className="text-2xl">{motorcycle.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {(motorcycle.manufacturer || motorcycle.model) && (
              <p className="text-muted-foreground">
                {[motorcycle.manufacturer, motorcycle.model]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )}
            {motorcycle.bike_type && (
              <p className="text-muted-foreground">
                {BIKE_TYPE_LABEL[motorcycle.bike_type]}
              </p>
            )}
            {motorcycle.displacement_cc !== null && (
              <p>
                排気量: {motorcycle.displacement_cc.toLocaleString("ja-JP")} cc
              </p>
            )}
            <div className="flex items-center justify-between gap-2">
              <p>
                現在の走行距離: {motorcycle.current_mileage.toLocaleString("ja-JP")} km
                <span className="text-muted-foreground">
                  ({formatMaintenanceDate(motorcycle.mileage_recorded_on)}時点)
                </span>
              </p>
              <QuickMileageUpdateButton
                currentMileage={motorcycle.current_mileage}
                mileageRecordedOn={motorcycle.mileage_recorded_on}
                action={updateMotorcycleMileage.bind(
                  null,
                  motorcycle.id,
                  `/motorcycles/${motorcycle.id}`,
                )}
              />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/motorcycles/${motorcycle.id}/edit`}>編集する</Link>
          </Button>
          <DeleteMotorcycleButton id={motorcycle.id} name={motorcycle.name} />
        </div>
      </div>

      {visibleNearDueSchedules.length > 0 && (
        <div className="w-full flex flex-col gap-4">
          <h2 className="text-lg font-bold">直近の整備予定</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleNearDueSchedules.map(({ schedule }) => (
              <MaintenanceScheduleCard
                key={schedule.id}
                schedule={schedule}
                currentMileage={motorcycle.current_mileage}
                mileageRecordedOn={motorcycle.mileage_recorded_on}
                todayDateStr={today}
              />
            ))}
          </div>
          {hasMoreNearDueSchedules && (
            <Link
              href={`/motorcycles/${motorcycle.id}/maintenance`}
              className="text-sm text-center underline underline-offset-4"
            >
              整備ページですべて見る
            </Link>
          )}
        </div>
      )}

      {visibleNearDueInsurancePolicies.length > 0 && (
        <div className="w-full flex flex-col gap-4">
          <h2 className="text-lg font-bold">保険の更新期限</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleNearDueInsurancePolicies.map(({ policy }) => (
              <InsurancePolicyCard
                key={policy.id}
                policy={policy}
                todayDateStr={today}
              />
            ))}
          </div>
          {hasMoreNearDueInsurancePolicies && (
            <Link
              href={`/motorcycles/${motorcycle.id}/insurance`}
              className="text-sm text-center underline underline-offset-4"
            >
              保険ページですべて見る
            </Link>
          )}
        </div>
      )}

      <div className="w-full grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Link href={`/motorcycles/${motorcycle.id}/fuel`}>
          <Card className="h-full transition-colors hover:bg-accent/50">
            <CardContent className="flex flex-col gap-1 pt-6 text-sm">
              <div className="flex items-center gap-2">
                <Fuel size={18} style={{ color: "hsl(var(--chart-4))" }} />
                <p className="font-medium">給油</p>
              </div>
              <p className="text-muted-foreground">{fuelRecordCount ?? 0}件</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/motorcycles/${motorcycle.id}/maintenance`}>
          <Card className="h-full transition-colors hover:bg-accent/50">
            <CardContent className="flex flex-col gap-1 pt-6 text-sm">
              <div className="flex items-center gap-2">
                <Wrench size={18} style={{ color: "hsl(var(--chart-1))" }} />
                <p className="font-medium">整備</p>
              </div>
              <p className="text-muted-foreground">{recordCount ?? 0}件の記録</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/motorcycles/${motorcycle.id}/custom-parts`}>
          <Card className="h-full transition-colors hover:bg-accent/50">
            <CardContent className="flex flex-col gap-1 pt-6 text-sm">
              <div className="flex items-center gap-2">
                <Sparkles size={18} style={{ color: "hsl(var(--chart-2))" }} />
                <p className="font-medium">カスタム</p>
              </div>
              <p className="text-muted-foreground">{customPartCount ?? 0}件</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/motorcycles/${motorcycle.id}/insurance`}>
          <Card className="h-full transition-colors hover:bg-accent/50">
            <CardContent className="flex flex-col gap-1 pt-6 text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} style={{ color: "hsl(var(--chart-3))" }} />
                <p className="font-medium">保険</p>
              </div>
              <p className="text-muted-foreground">{insurancePolicies.length}件</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/motorcycles/${motorcycle.id}/loans`}>
          <Card className="h-full transition-colors hover:bg-accent/50">
            <CardContent className="flex flex-col gap-1 pt-6 text-sm">
              <div className="flex items-center gap-2">
                <Landmark size={18} style={{ color: "hsl(var(--chart-5))" }} />
                <p className="font-medium">ローン</p>
              </div>
              <p className="text-muted-foreground">{loans.length}件</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/motorcycles/${motorcycle.id}/analysis`}>
          <Card className="h-full transition-colors hover:bg-accent/50">
            <CardContent className="flex flex-col gap-1 pt-6 text-sm">
              <div className="flex items-center gap-2">
                <ChartPie size={18} className="text-muted-foreground" />
                <p className="font-medium">分析</p>
              </div>
              <p className="text-muted-foreground">
                合計 {formatYen(totalCost)}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

export default function MotorcycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      <Suspense fallback={<MotorcycleDetailSkeleton />}>
        <MotorcycleDetail params={params} />
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
