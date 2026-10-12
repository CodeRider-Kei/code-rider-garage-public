import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import type { MaintenanceCycleSetting } from "@/lib/maintenance-cycle-setting";
import { Card, CardContent } from "@/components/ui/card";
import { MaintenanceCycleSettingForm } from "@/components/maintenance-cycle-setting-form";
import { updateMaintenanceCycleSetting } from "./actions";
import { FormCardSkeleton } from "@/components/skeletons";

type MaintenanceCycleSettingRow = MaintenanceCycleSetting & {
  motorcycle_id: string;
};

async function EditMaintenanceCycleSettingForm({
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

  const { data, error: settingError } = await supabase
    .from("maintenance_cycle_settings")
    .select("id, motorcycle_id, item_name, category, distance_interval_km, period_interval_months")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (settingError) {
    console.error("[EditMaintenanceCycleSettingForm] maintenance_cycle_settings fetch failed:", settingError.code, settingError.message);
  }

  const setting = data as MaintenanceCycleSettingRow | null;

  if (!setting) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          整備サイクル設定が見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  const { data: motorcycleData, error: motorcycleError } = await supabase
    .from("motorcycles")
    .select("id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color")
    .eq("id", setting.motorcycle_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (motorcycleError) {
    console.error("[EditMaintenanceCycleSettingForm] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
  }

  const motorcycle = motorcycleData as Motorcycle | null;

  if (!motorcycle) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          整備サイクル設定が見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  return (
    <MaintenanceCycleSettingForm
      motorcycleId={motorcycle.id}
      motorcycleName={motorcycle.name}
      action={updateMaintenanceCycleSetting}
      setting={setting}
    />
  );
}

export default function EditMaintenanceCycleSettingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-sm md:max-w-md mx-auto">
      <Suspense fallback={<FormCardSkeleton fields={4} />}>
        <EditMaintenanceCycleSettingForm params={params} />
      </Suspense>
    </div>
  );
}
