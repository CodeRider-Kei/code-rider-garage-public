import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import {
  formatMaintenanceDate,
  type MaintenanceRecord,
} from "@/lib/maintenance-record";
import { formatYen } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteMaintenanceRecordButton } from "@/components/delete-maintenance-record-button";
import { DetailCardSkeleton } from "@/components/skeletons";

type MaintenanceRecordRow = MaintenanceRecord & {
  motorcycle_id: string;
};

async function MaintenanceRecordDetail({
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

  const { data, error: recordError } = await supabase
    .from("maintenance_records")
    .select(
      "id, motorcycle_id, maintenance_date, category, mileage, cost, note, cycle_setting_id, item_name, distance_interval_km, period_interval_months",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (recordError) {
    console.error("[MaintenanceRecordDetail] maintenance_records fetch failed:", recordError.code, recordError.message);
  }

  const record = data as MaintenanceRecordRow | null;

  if (!record) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            整備記録が見つかりませんでした。削除されたか、閲覧する権限がありません。
          </CardContent>
        </Card>
        <Link
          href="/dashboard"
          className="text-sm text-center underline underline-offset-4"
        >
          ダッシュボードに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {formatMaintenanceDate(record.maintenance_date)}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-muted-foreground">{record.category}</p>
          {record.mileage !== null && (
            <p>走行距離: {record.mileage.toLocaleString("ja-JP")} km</p>
          )}
          {record.cost !== null && (
            <p>費用: {formatYen(record.cost)}</p>
          )}
          {record.note && (
            <p className="whitespace-pre-wrap">{record.note}</p>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/maintenance/${record.id}/edit`}>編集する</Link>
        </Button>
        <DeleteMaintenanceRecordButton id={record.id} />
      </div>
      <Link
        href={`/motorcycles/${record.motorcycle_id}`}
        className="text-sm text-center underline underline-offset-4"
      >
        バイク詳細に戻る
      </Link>
    </div>
  );
}

export default function MaintenanceRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-sm md:max-w-md mx-auto flex flex-col gap-6">
      <Suspense fallback={<DetailCardSkeleton />}>
        <MaintenanceRecordDetail params={params} />
      </Suspense>
    </div>
  );
}
