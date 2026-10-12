import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import type { CustomPart } from "@/lib/custom-part";
import { Card, CardContent } from "@/components/ui/card";
import { CustomPartForm } from "@/components/custom-part-form";
import { updateCustomPart } from "./actions";
import { FormCardSkeleton } from "@/components/skeletons";

type CustomPartRow = CustomPart & {
  motorcycle_id: string;
};

async function EditCustomPartForm({
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

  const { data, error: partError } = await supabase
    .from("custom_parts")
    .select(
      "id, motorcycle_id, part_name, category, brand, shop_name, purchase_date, mileage, cost, note",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (partError) {
    console.error("[EditCustomPartForm] custom_parts fetch failed:", partError.code, partError.message);
  }

  const part = data as CustomPartRow | null;

  if (!part) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          カスタムパーツが見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  const { data: motorcycleData, error: motorcycleError } = await supabase
    .from("motorcycles")
    .select(
      "id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color",
    )
    .eq("id", part.motorcycle_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (motorcycleError) {
    console.error("[EditCustomPartForm] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
  }

  const motorcycle = motorcycleData as Motorcycle | null;

  if (!motorcycle) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          カスタムパーツが見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  return (
    <CustomPartForm
      motorcycleId={motorcycle.id}
      motorcycleName={motorcycle.name}
      currentMileage={motorcycle.current_mileage}
      action={updateCustomPart}
      part={part}
    />
  );
}

export default function EditCustomPartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-sm md:max-w-md mx-auto">
      <Suspense fallback={<FormCardSkeleton fields={6} />}>
        <EditCustomPartForm params={params} />
      </Suspense>
    </div>
  );
}
