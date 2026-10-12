import Link from "next/link";

import { formatMaintenanceDate } from "@/lib/maintenance-record";
import { formatYen } from "@/lib/format";
import type { CustomPart } from "@/lib/custom-part";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteCustomPartButton } from "@/components/delete-custom-part-button";

export function CustomPartCard({ part }: { part: CustomPart }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6 text-sm">
        <div>
          <p className="font-medium">{part.part_name}</p>
          <p className="text-muted-foreground">{part.category}</p>
        </div>
        {part.brand && <p>ブランド: {part.brand}</p>}
        <p>取付日: {formatMaintenanceDate(part.purchase_date)}</p>
        {part.mileage !== null && (
          <p className="text-muted-foreground">
            取付時走行距離: {part.mileage.toLocaleString("ja-JP")} km
          </p>
        )}
        {part.cost !== null && (
          <p className="text-muted-foreground">
            費用: {formatYen(part.cost)}
          </p>
        )}
        {part.shop_name && <p>購入・施工店舗: {part.shop_name}</p>}
        {part.note && (
          <p className="whitespace-pre-wrap text-muted-foreground">
            {part.note}
          </p>
        )}
        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/custom-parts/${part.id}/edit`}>編集</Link>
          </Button>
          <DeleteCustomPartButton id={part.id} partName={part.part_name} />
        </div>
      </CardContent>
    </Card>
  );
}
