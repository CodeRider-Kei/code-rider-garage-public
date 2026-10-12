import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import type { MaintenanceCycleSetting } from "@/lib/maintenance-cycle-setting";
import { Card, CardContent } from "@/components/ui/card";
import { MaintenanceRecordForm } from "@/components/maintenance-record-form";
import { createMaintenanceRecord } from "./actions";
import { FormCardSkeleton } from "@/components/skeletons";

async function NewMaintenanceRecordForm({
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
    .select("id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (motorcycleError) {
    console.error("[NewMaintenanceRecordForm] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
  }

  const motorcycle = data as Motorcycle | null;

  if (!motorcycle) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          バイクが見つかりませんでした。削除されたか、登録する権限がありません。
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

  const action = createMaintenanceRecord.bind(null, motorcycle.id);

  return (
    <MaintenanceRecordForm
      motorcycleId={motorcycle.id}
      motorcycleName={motorcycle.name}
      currentMileage={motorcycle.current_mileage}
      action={action}
      cycleSettings={cycleSettingsData ?? []}
    />
  );
}

export default function NewMaintenanceRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-sm md:max-w-md mx-auto">
      <Suspense fallback={<FormCardSkeleton fields={5} />}>
        <NewMaintenanceRecordForm params={params} />
      </Suspense>
    </div>
  );
}
