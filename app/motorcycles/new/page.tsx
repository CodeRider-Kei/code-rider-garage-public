import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { FREE_MOTORCYCLE_LIMIT } from "@/lib/motorcycle";
import { Card, CardContent } from "@/components/ui/card";
import { MotorcycleForm } from "@/components/motorcycle-form";
import { FormCardSkeleton } from "@/components/skeletons";

async function NewMotorcycleForm() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();
  const user = userData?.claims;

  if (userError || !user) {
    redirect("/auth/login");
  }

  const { count } = await supabase
    .from("motorcycles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.sub as string);

  if ((count ?? 0) >= FREE_MOTORCYCLE_LIMIT) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col gap-3 text-center text-sm">
          <p className="text-muted-foreground">
            現在登録できるバイクは{FREE_MOTORCYCLE_LIMIT}台までです。
          </p>
          <Link
            href="/dashboard"
            className="underline underline-offset-4"
          >
            ダッシュボードに戻る
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <MotorcycleForm />;
}

export default function NewMotorcyclePage() {
  return (
    <div className="w-full max-w-sm md:max-w-md mx-auto">
      <Suspense fallback={<FormCardSkeleton fields={5} />}>
        <NewMotorcycleForm />
      </Suspense>
    </div>
  );
}
