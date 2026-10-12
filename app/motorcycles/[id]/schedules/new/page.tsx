import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import { Card, CardContent } from "@/components/ui/card";
import { MaintenanceScheduleForm } from "@/components/maintenance-schedule-form";
import { createMaintenanceSchedule } from "./actions";
import { FormCardSkeleton } from "@/components/skeletons";

async function NewMaintenanceScheduleForm({
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
    console.error("[NewMaintenanceScheduleForm] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
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

  const action = createMaintenanceSchedule.bind(null, motorcycle.id);

  return (
    <MaintenanceScheduleForm
      motorcycleId={motorcycle.id}
      motorcycleName={motorcycle.name}
      action={action}
    />
  );
}

export default function NewMaintenanceSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-sm md:max-w-md mx-auto">
      <Suspense fallback={<FormCardSkeleton fields={4} />}>
        <NewMaintenanceScheduleForm params={params} />
      </Suspense>
    </div>
  );
}
