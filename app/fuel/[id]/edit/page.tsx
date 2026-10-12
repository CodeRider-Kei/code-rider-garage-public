import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import type { FuelRecord } from "@/lib/fuel-record";
import { Card, CardContent } from "@/components/ui/card";
import { FuelRecordForm } from "@/components/fuel-record-form";
import { updateFuelRecord } from "./actions";
import { FormCardSkeleton } from "@/components/skeletons";

type FuelRecordRow = FuelRecord & {
  motorcycle_id: string;
};

async function EditFuelRecordForm({
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
    .from("fuel_records")
    .select("id, motorcycle_id, filled_on, mileage, liters, cost, is_full_tank, note")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (recordError) {
    console.error("[EditFuelRecordForm] fuel_records fetch failed:", recordError.code, recordError.message);
  }

  const record = data as FuelRecordRow | null;

  if (!record) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          給油記録が見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  const { data: motorcycleData, error: motorcycleError } = await supabase
    .from("motorcycles")
    .select(
      "id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color",
    )
    .eq("id", record.motorcycle_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (motorcycleError) {
    console.error("[EditFuelRecordForm] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
  }

  const motorcycle = motorcycleData as Motorcycle | null;

  if (!motorcycle) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          給油記録が見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  return (
    <FuelRecordForm
      motorcycleId={motorcycle.id}
      motorcycleName={motorcycle.name}
      currentMileage={motorcycle.current_mileage}
      action={updateFuelRecord}
      record={{ ...record, liters: Number(record.liters) }}
    />
  );
}

export default function EditFuelRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-sm md:max-w-md mx-auto">
      <Suspense fallback={<FormCardSkeleton fields={5} />}>
        <EditFuelRecordForm params={params} />
      </Suspense>
    </div>
  );
}
