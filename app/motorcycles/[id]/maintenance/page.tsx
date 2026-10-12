import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import {
  MAINTENANCE_CATEGORIES,
  formatMaintenanceDate,
  type MaintenanceRecord,
} from "@/lib/maintenance-record";
import { formatYen } from "@/lib/format";
import { getTodayDateString, type MaintenanceSchedule } from "@/lib/maintenance-schedule";
import type { MaintenanceCycleSetting } from "@/lib/maintenance-cycle-setting";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteMaintenanceCycleSettingButton } from "@/components/delete-maintenance-cycle-setting-button";
import { MaintenanceScheduleCard } from "@/components/maintenance-schedule-card";
import { MaintenanceCalendar } from "@/components/maintenance-calendar";
import { MaintenanceRecordFilters } from "@/components/maintenance-record-filters";
import { MaintenancePageSkeleton } from "@/components/skeletons";

async function MaintenancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    category?: string;
    sort?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
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
    console.error("[MaintenancePage] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
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

  const categoryFilter =
    query.category &&
    MAINTENANCE_CATEGORIES.includes(
      query.category as (typeof MAINTENANCE_CATEGORIES)[number],
    )
      ? query.category
      : undefined;
  const sortAscending = query.sort === "asc";

  let recordsQuery = supabase
    .from("maintenance_records")
    .select(
      "id, maintenance_date, category, mileage, cost, note, cycle_setting_id, item_name, distance_interval_km, period_interval_months",
    )
    .eq("motorcycle_id", motorcycle.id);

  if (categoryFilter) {
    recordsQuery = recordsQuery.eq("category", categoryFilter);
  }

  // 互いに独立したクエリなので並列実行し、月切り替えを伴わない初回表示の
  // 待ち時間も短縮する。
  const [
    { data: allRecordsData },
    { data: recordsData },
    { data: cycleSettingsData },
    { data: schedulesData },
  ] = await Promise.all([
    supabase.from("maintenance_records").select("id").eq("motorcycle_id", motorcycle.id),
    recordsQuery
      .order("maintenance_date", { ascending: sortAscending })
      .returns<MaintenanceRecord[]>(),
    supabase
      .from("maintenance_cycle_settings")
      .select("id, item_name, category, distance_interval_km, period_interval_months")
      .eq("motorcycle_id", motorcycle.id)
      .order("item_name", { ascending: true })
      .returns<MaintenanceCycleSetting[]>(),
    supabase
      .from("maintenance_schedules")
      .select(
        "id, cycle_setting_id, item_name, category, next_due_date, next_due_mileage, distance_interval_km, note",
      )
      .eq("motorcycle_id", motorcycle.id)
      .order("next_due_date", { ascending: true, nullsFirst: false })
      .returns<MaintenanceSchedule[]>(),
  ]);

  const hasAnyRecords = (allRecordsData ?? []).length > 0;
  const records = recordsData ?? [];
  const cycleSettings = cycleSettingsData ?? [];

  const schedules = schedulesData ?? [];
  const dateSchedules = schedules.filter((s) => s.next_due_date !== null);
  const mileageOnlySchedules = schedules.filter((s) => s.next_due_date === null);

  const today = getTodayDateString();
  const [todayYear, todayMonth] = today.split("-").map(Number);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">{motorcycle.name} - 整備</h1>

      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">整備サイクル設定</h2>
          <Button asChild size="sm">
            <Link href={`/motorcycles/${motorcycle.id}/cycle-settings/new`}>
              ＋ 設定を追加
            </Link>
          </Button>
        </div>

        {cycleSettings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              まだ整備サイクル設定が登録されていません。整備記録の登録時に次回予定を自動計算するには、先にここで項目ごとの間隔を設定してください。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cycleSettings.map((setting) => (
              <Card key={setting.id}>
                <CardContent className="flex flex-col gap-2 pt-6 text-sm">
                  <div>
                    <p className="font-medium">{setting.item_name}</p>
                    <p className="text-muted-foreground">{setting.category}</p>
                  </div>
                  <p className="text-muted-foreground">
                    {[
                      setting.distance_interval_km !== null
                        ? `${setting.distance_interval_km.toLocaleString("ja-JP")}kmごと`
                        : null,
                      setting.period_interval_months !== null
                        ? `${setting.period_interval_months}か月ごと`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" / ")}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button asChild variant="outline" className="flex-1">
                      <Link href={`/cycle-settings/${setting.id}/edit`}>編集</Link>
                    </Button>
                    <DeleteMaintenanceCycleSettingButton
                      id={setting.id}
                      itemName={setting.item_name}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="w-full flex flex-col gap-4">
        <h2 className="text-lg font-bold">整備予定カレンダー</h2>
        <MaintenanceCalendar
          schedules={dateSchedules}
          todayDateStr={today}
          currentMileage={motorcycle.current_mileage}
          mileageRecordedOn={motorcycle.mileage_recorded_on}
          initialYear={todayYear}
          initialMonth={todayMonth}
        />
      </div>

      <div className="w-full flex flex-col gap-4">
        <h2 className="text-lg font-bold">距離のみの予定</h2>
        {mileageOnlySchedules.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              距離のみを基準にした予定はありません。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mileageOnlySchedules.map((schedule) => (
              <MaintenanceScheduleCard
                key={schedule.id}
                schedule={schedule}
                currentMileage={motorcycle.current_mileage}
                mileageRecordedOn={motorcycle.mileage_recorded_on}
                todayDateStr={today}
              />
            ))}
          </div>
        )}
      </div>

      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">整備記録</h2>
          <Button asChild size="sm">
            <Link href={`/motorcycles/${motorcycle.id}/maintenance/new`}>
              ＋ 記録を追加
            </Link>
          </Button>
        </div>

        {hasAnyRecords && <MaintenanceRecordFilters />}

        {records.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              {hasAnyRecords
                ? "条件に一致する整備記録がありません。"
                : "まだ整備記録がありません。"}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {records.map((record) => (
              <Link key={record.id} href={`/maintenance/${record.id}`} className="h-full">
                <Card className="h-full transition-colors hover:bg-accent/50">
                  <CardContent className="flex h-full flex-col gap-1 pt-6 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {formatMaintenanceDate(record.maintenance_date)}
                      </span>
                      <span className="text-muted-foreground">
                        {record.category}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      走行距離:{" "}
                      {record.mileage !== null
                        ? `${record.mileage.toLocaleString("ja-JP")} km`
                        : "―"}
                    </p>
                    <p className="text-muted-foreground">
                      費用:{" "}
                      {record.cost !== null ? formatYen(record.cost) : "―"}
                    </p>
                    {/* 任意項目の入力有無で表示行数・カード高さが変わらないよう、
                        メモ欄は常に同じ領域を確保し(min-h)、長文は2行に固定表示する(line-clamp)。 */}
                    <p className="line-clamp-2 min-h-[2.5rem] whitespace-pre-wrap text-muted-foreground">
                      {record.note}
                    </p>
                  </CardContent>
                </Card>
              </Link>
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

export default function MotorcycleMaintenancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    category?: string;
    sort?: string;
  }>;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      <Suspense fallback={<MaintenancePageSkeleton />}>
        <MaintenancePage params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
