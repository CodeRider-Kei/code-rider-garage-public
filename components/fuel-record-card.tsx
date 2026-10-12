import Link from "next/link";

import { formatMaintenanceDate } from "@/lib/maintenance-record";
import { formatYen } from "@/lib/format";
import type { FuelRecord } from "@/lib/fuel-record";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteFuelRecordButton } from "@/components/delete-fuel-record-button";

export function FuelRecordCard({
  record,
  kmPerLiter,
}: {
  record: FuelRecord;
  kmPerLiter?: number;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6 text-sm">
        <div>
          <p className="font-medium">{formatMaintenanceDate(record.filled_on)}</p>
          {!record.is_full_tank && (
            <p className="text-muted-foreground">満タンではない給油</p>
          )}
        </div>
        <p className="text-muted-foreground">
          給油量: {record.liters.toLocaleString("ja-JP")} L
        </p>
        {record.mileage !== null && (
          <p className="text-muted-foreground">
            走行距離: {record.mileage.toLocaleString("ja-JP")} km
          </p>
        )}
        {record.cost !== null && (
          <p className="text-muted-foreground">
            費用: {formatYen(record.cost)}
          </p>
        )}
        {kmPerLiter !== undefined && (
          <p className="text-muted-foreground">
            燃費: {kmPerLiter.toFixed(1)} km/L
          </p>
        )}
        {record.note && (
          <p className="whitespace-pre-wrap text-muted-foreground">
            {record.note}
          </p>
        )}
        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/fuel/${record.id}/edit`}>編集</Link>
          </Button>
          <DeleteFuelRecordButton
            id={record.id}
            filledOn={formatMaintenanceDate(record.filled_on)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
