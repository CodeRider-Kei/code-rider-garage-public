import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import type { MaintenanceSchedule } from "@/lib/maintenance-schedule";
import { Card, CardContent } from "@/components/ui/card";
import { MaintenanceScheduleForm } from "@/components/maintenance-schedule-form";
import { updateMaintenanceSchedule } from "./actions";
import { FormCardSkeleton } from "@/components/skeletons";

type MaintenanceScheduleRow = MaintenanceSchedule & {
  motorcycle_id: string;
};

async function EditMaintenanceScheduleForm({
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

  const { data, error: scheduleError } = await supabase
    .from("maintenance_schedules")
    .select(
      "id, motorcycle_id, cycle_setting_id, item_name, category, next_due_date, next_due_mileage, distance_interval_km, note",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (scheduleError) {
    console.error("[EditMaintenanceScheduleForm] maintenance_schedules fetch failed:", scheduleError.code, scheduleError.message);
  }

  const schedule = data as MaintenanceScheduleRow | null;

  if (!schedule) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          整備予定が見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  if (schedule.cycle_setting_id) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="pt-6 flex flex-col gap-2 text-center text-sm text-muted-foreground">
            <p>
              この予定はサイクル設定から自動計算されているため、直接編集できません。
            </p>
            <p>
              内容を変えたい場合は整備記録の登録時に次回整備時期を再設定してください。予定自体を終了したい場合はバイク詳細画面から削除できます。
            </p>
          </CardContent>
        </Card>
        <Link
          href={`/motorcycles/${schedule.motorcycle_id}`}
          className="text-sm text-center underline underline-offset-4"
        >
          バイク詳細に戻る
        </Link>
      </div>
    );
  }

  const { data: motorcycleData, error: motorcycleError } = await supabase
    .from("motorcycles")
    .select("id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color")
    .eq("id", schedule.motorcycle_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (motorcycleError) {
    console.error("[EditMaintenanceScheduleForm] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
  }

  const motorcycle = motorcycleData as Motorcycle | null;

  if (!motorcycle) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          整備予定が見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  return (
    <MaintenanceScheduleForm
      motorcycleId={motorcycle.id}
      motorcycleName={motorcycle.name}
      action={updateMaintenanceSchedule}
      schedule={schedule}
    />
  );
}

export default function EditMaintenanceSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-sm md:max-w-md mx-auto">
      <Suspense fallback={<FormCardSkeleton fields={4} />}>
        <EditMaintenanceScheduleForm params={params} />
      </Suspense>
    </div>
  );
}
