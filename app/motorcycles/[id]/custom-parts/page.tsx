import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Motorcycle } from "@/lib/motorcycle";
import type { CustomPart } from "@/lib/custom-part";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomPartCard } from "@/components/custom-part-card";
import { ListPageSkeleton } from "@/components/skeletons";

async function CustomPartsPage({
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

  // 所有権チェックとカスタムパーツ一覧は互いに独立したクエリなので、
  // motorcycle_idはルートパラメータのidをそのまま使って並列実行する
  // (custom_partsテーブル側もRLSで所有権が担保されているため安全)。
  const [{ data, error: motorcycleError }, { data: customPartsData }] = await Promise.all([
    supabase
      .from("motorcycles")
      .select(
        "id, name, manufacturer, model, current_mileage, mileage_recorded_on, displacement_cc, bike_type, icon_color",
      )
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("custom_parts")
      .select(
        "id, part_name, category, brand, shop_name, purchase_date, mileage, cost, note",
      )
      .eq("motorcycle_id", id)
      .order("purchase_date", { ascending: false })
      .returns<CustomPart[]>(),
  ]);

  if (motorcycleError) {
    console.error("[CustomPartsPage] motorcycles fetch failed:", motorcycleError.code, motorcycleError.message);
  }

  const motorcycle = data as Motorcycle | null;

  if (!motorcycle) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          バイクが見つかりませんでした。削除されたか、閲覧する権限がありません。
        </CardContent>
      </Card>
    );
  }

  const customParts = customPartsData ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">{motorcycle.name} - カスタム</h1>

      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">カスタムパーツ</h2>
          <Button asChild size="sm">
            <Link href={`/motorcycles/${motorcycle.id}/custom-parts/new`}>
              ＋ パーツを登録
            </Link>
          </Button>
        </div>

        {customParts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              まだカスタムパーツが登録されていません。整備記録とは別に、アップグレード・カスタム費用だけをここで管理できます。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customParts.map((part) => (
              <CustomPartCard key={part.id} part={part} />
            ))}
          </div>
        )}
      </div>

      <Link
        href={`/motorcycles/${motorcycle.id}`}
        className="text-sm text-center underline underline-offset-4"
      >
        バイク詳細に戻る
      </Link>
    </div>
  );
}

export default function MotorcycleCustomPartsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      <Suspense fallback={<ListPageSkeleton actions />}>
        <CustomPartsPage params={params} />
      </Suspense>
    </div>
  );
}
