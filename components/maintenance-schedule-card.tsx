import Link from "next/link";

import {
  DUE_STATUS_BADGE_CLASS,
  DUE_STATUS_LABEL,
  MILEAGE_DUE_STATUS_LABEL,
  getDueStatus,
  getMileageDueStatus,
  type DueStatus,
  type MaintenanceSchedule,
} from "@/lib/maintenance-schedule";
import { formatMaintenanceDate } from "@/lib/maintenance-record";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteMaintenanceScheduleButton } from "@/components/delete-maintenance-schedule-button";

export function MaintenanceScheduleCard({
  schedule,
  currentMileage,
  mileageRecordedOn,
  todayDateStr,
}: {
  schedule: MaintenanceSchedule;
  currentMileage: number;
  mileageRecordedOn: string;
  todayDateStr: string;
}) {
  const isAuto = schedule.cycle_setting_id !== null;
  const dateStatus = schedule.next_due_date
    ? getDueStatus(schedule.next_due_date, todayDateStr)
    : null;
  const mileageStatus =
    schedule.next_due_mileage !== null && schedule.distance_interval_km !== null
      ? getMileageDueStatus(
          schedule.next_due_mileage,
          schedule.distance_interval_km,
          currentMileage,
        )
      : null;

  // 日付・距離の両方が「余裕あり」「期限間近」の場合はラベルが同じ文言になるため、
  // 同一ラベルのバッジを2つ並べて表示しない(距離超過/期限超過のように文言が
  // 異なる場合のみ、両方の情報を残す)。
  const badges: { key: string; label: string; status: DueStatus }[] = [];
  if (dateStatus) {
    badges.push({ key: "date", label: DUE_STATUS_LABEL[dateStatus], status: dateStatus });
  }
  if (mileageStatus) {
    const label = MILEAGE_DUE_STATUS_LABEL[mileageStatus];
    if (!badges.some((b) => b.label === label)) {
      badges.push({ key: "mileage", label, status: mileageStatus });
    }
  }

  const remainingKm =
    schedule.next_due_mileage !== null
      ? schedule.next_due_mileage - currentMileage
      : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{schedule.item_name}</p>
            <p className="text-muted-foreground">{schedule.category}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {badges.map((badge) => (
              <Badge
                key={badge.key}
                className={cn("whitespace-nowrap", DUE_STATUS_BADGE_CLASS[badge.status])}
              >
                {badge.label}
              </Badge>
            ))}
          </div>
        </div>
        {/* 日付のみ・距離のみ・両方ありの予定でカードの高さが揃うよう、
            該当しない項目も行自体は常に描画し、値がない部分だけ「―」にする。 */}
        <p>
          次回予定日:{" "}
          {schedule.next_due_date ? formatMaintenanceDate(schedule.next_due_date) : "―"}
        </p>
        <p>
          次回予定距離:{" "}
          {schedule.next_due_mileage !== null
            ? `${schedule.next_due_mileage.toLocaleString("ja-JP")} km`
            : "―"}
        </p>
        <p className="min-h-[2.5rem] text-muted-foreground">
          {schedule.next_due_mileage !== null
            ? `残り約${Math.max(remainingKm ?? 0, 0).toLocaleString("ja-JP")}km(現在の走行距離 ${currentMileage.toLocaleString("ja-JP")}km、${formatMaintenanceDate(mileageRecordedOn)}時点の入力値による目安)`
            : "―"}
        </p>
        {isAuto && (
          <p className="text-xs text-muted-foreground">
            サイクル設定から自動計算。整備記録を追加すると更新されます。
          </p>
        )}
        {schedule.note && (
          <p className="whitespace-pre-wrap text-muted-foreground">
            {schedule.note}
          </p>
        )}
        {!isAuto && (
          <div className="flex gap-2 pt-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/schedules/${schedule.id}/edit`}>編集</Link>
            </Button>
            <DeleteMaintenanceScheduleButton id={schedule.id} itemName={schedule.item_name} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
