import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import type { Loan } from "@/lib/loan";
import { Card, CardContent } from "@/components/ui/card";
import { LoanForm } from "@/components/loan-form";
import { updateLoan } from "./actions";
import { FormCardSkeleton } from "@/components/skeletons";

type LoanRow = Loan & {
  motorcycle_id: string;
};

async function EditLoanForm({
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

  const { data, error: loanError } = await supabase
    .from("loans")
    .select(
      "id, motorcycle_id, lender_name, principal, annual_interest_rate, monthly_payment, term_months, start_date, bonus_payment_amount, bonus_month_1, bonus_month_2, note",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (loanError) {
    console.error("[EditLoanForm] loans fetch failed:", loanError.code, loanError.message);
  }

  const loan = data as LoanRow | null;

  if (!loan) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          ローンが見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  const { data: motorcycleData, error: motorcycleError } = await supabase
    .from("motorcycles")
    .select(
      "id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color",
    )
    .eq("id", loan.motorcycle_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (motorcycleError) {
    console.error("[EditLoanForm] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
  }

  const motorcycle = motorcycleData as Motorcycle | null;

  if (!motorcycle) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          ローンが見つかりませんでした。削除されたか、編集する権限がありません。
        </CardContent>
      </Card>
    );
  }

  return (
    <LoanForm
      motorcycleId={motorcycle.id}
      motorcycleName={motorcycle.name}
      action={updateLoan}
      loan={{
        ...loan,
        annual_interest_rate:
          loan.annual_interest_rate === null ? null : Number(loan.annual_interest_rate),
      }}
    />
  );
}

export default function EditLoanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-sm md:max-w-md mx-auto">
      <Suspense fallback={<FormCardSkeleton fields={5} />}>
        <EditLoanForm params={params} />
      </Suspense>
    </div>
  );
}
