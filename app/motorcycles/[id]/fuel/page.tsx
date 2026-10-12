import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import type { FuelRecord } from "@/lib/fuel-record";
import { calculateFuelEconomy } from "@/lib/fuel-economy";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FuelRecordCard } from "@/components/fuel-record-card";
import { ListPageSkeleton } from "@/components/skeletons";

async function FuelRecordsPage({
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

  // 所有権チェックと給油記録一覧は互いに独立したクエリなので、motorcycle_idは
  // ルートパラメータのidをそのまま使って並列実行する
  // (fuel_recordsテーブル側もRLSで所有権が担保されているため安全)。
  const [{ data, error: motorcycleError }, { data: fuelRecordsData }] = await Promise.all([
    supabase
      .from("motorcycles")
      .select(
        "id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color",
      )
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("fuel_records")
      .select("id, filled_on, mileage, liters, cost, is_full_tank, note")
      .eq("motorcycle_id", id)
      .order("filled_on", { ascending: false })
      .returns<FuelRecord[]>(),
  ]);

  if (motorcycleError) {
    console.error("[FuelRecordsPage] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
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

  const fuelRecords = (fuelRecordsData ?? []).map((record) => ({
    ...record,
    liters: Number(record.liters),
  }));

  const economyById = new Map(
    calculateFuelEconomy(fuelRecords).map((point) => [point.id, point.kmPerLiter]),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">{motorcycle.name} - 給油</h1>

      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">給油記録</h2>
          <Button asChild size="sm">
            <Link href={`/motorcycles/${motorcycle.id}/fuel/new`}>
              ＋ 給油記録を登録
            </Link>
          </Button>
        </div>

        {fuelRecords.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              まだ給油記録が登録されていません。給油のたびに記録すると、燃費(km/L)も自動で計算されます。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fuelRecords.map((record) => (
              <FuelRecordCard
                key={record.id}
                record={record}
                kmPerLiter={economyById.get(record.id)}
              />
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

export default function MotorcycleFuelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      <Suspense fallback={<ListPageSkeleton actions />}>
        <FuelRecordsPage params={params} />
      </Suspense>
    </div>
  );
}
