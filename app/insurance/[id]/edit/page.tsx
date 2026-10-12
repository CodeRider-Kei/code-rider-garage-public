import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import type { InsurancePolicy } from "@/lib/insurance";
import { Card, CardContent } from "@/components/ui/card";
import { InsurancePolicyForm } from "@/components/insurance-policy-form";
import { updateInsurancePolicy } from "./actions";
import { FormCardSkeleton } from "@/components/skeletons";

type InsurancePolicyRow = InsurancePolicy & {
  motorcycle_id: string;
};

async function EditInsurancePolicyForm({
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

  const { data, error: policyError } = await supabase
    .from("insurance_policies")
    .select(
      "id, motorcycle_id, insurance_type, insurer_name, payment_frequency, premium_cost, period_start, period_end, note",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (policyError) {
    console.error("[EditInsurancePolicyForm] insurance_policies fetch failed:", policyError.code, policyError.message);
  }

  const policy = data as InsurancePolicyRow | null;

  if (!policy) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          保険情報が見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  const { data: motorcycleData, error: motorcycleError } = await supabase
    .from("motorcycles")
    .select(
      "id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color",
    )
    .eq("id", policy.motorcycle_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (motorcycleError) {
    console.error("[EditInsurancePolicyForm] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
  }

  const motorcycle = motorcycleData as Motorcycle | null;

  if (!motorcycle) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          保険情報が見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  return (
    <InsurancePolicyForm
      motorcycleId={motorcycle.id}
      motorcycleName={motorcycle.name}
      action={updateInsurancePolicy}
      policy={policy}
    />
  );
}

export default function EditInsurancePolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-sm md:max-w-md mx-auto">
      <Suspense fallback={<FormCardSkeleton fields={5} />}>
        <EditInsurancePolicyForm params={params} />
      </Suspense>
    </div>
  );
}
