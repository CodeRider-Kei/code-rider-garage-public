import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import type { MaintenanceRecord } from "@/lib/maintenance-record";
import type { MaintenanceCycleSetting } from "@/lib/maintenance-cycle-setting";
import { Card, CardContent } from "@/components/ui/card";
import { MaintenanceRecordForm } from "@/components/maintenance-record-form";
import { updateMaintenanceRecord } from "./actions";
import { FormCardSkeleton } from "@/components/skeletons";

type MaintenanceRecordRow = MaintenanceRecord & {
  motorcycle_id: string;
};

async function EditMaintenanceRecordForm({
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
    console.error("[EditMaintenanceRecordForm] maintenance_records fetch failed:", recordError.code, recordError.message);
  }

  const record = data as MaintenanceRecordRow | null;

  if (!record) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          整備記録が見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  const { data: motorcycleData, error: motorcycleError } = await supabase
    .from("motorcycles")
    .select("id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color")
    .eq("id", record.motorcycle_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (motorcycleError) {
    console.error("[EditMaintenanceRecordForm] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
  }

  const motorcycle = motorcycleData as Motorcycle | null;

  if (!motorcycle) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          整備記録が見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  const { data: cycleSettingsData } = await supabase
    .from("maintenance_cycle_settings")
    .select("id, item_name, category, distance_interval_km, period_interval_months")
    .eq("motorcycle_id", motorcycle.id)
    .order("item_name", { ascending: true })
    .returns<MaintenanceCycleSetting[]>();

  return (
    <MaintenanceRecordForm
      motorcycleId={motorcycle.id}
      motorcycleName={motorcycle.name}
      currentMileage={motorcycle.current_mileage}
      action={updateMaintenanceRecord}
      record={record}
      cycleSettings={cycleSettingsData ?? []}
    />
  );
}

export default function EditMaintenanceRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-sm md:max-w-md mx-auto">
      <Suspense fallback={<FormCardSkeleton fields={5} />}>
        <EditMaintenanceRecordForm params={params} />
      </Suspense>
    </div>
  );
}
