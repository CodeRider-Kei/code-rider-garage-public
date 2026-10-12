import Link from "next/link";

import {
  DUE_STATUS_BADGE_CLASS,
  DUE_STATUS_LABEL,
  getDueStatus,
} from "@/lib/maintenance-schedule";
import { formatMaintenanceDate } from "@/lib/maintenance-record";
import { formatYen } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  INSURANCE_PAYMENT_FREQUENCY_LABEL,
  INSURANCE_TYPE_LABEL,
  type InsurancePolicy,
} from "@/lib/insurance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteInsurancePolicyButton } from "@/components/delete-insurance-policy-button";

export function InsurancePolicyCard({
  policy,
  todayDateStr,
}: {
  policy: InsurancePolicy;
  todayDateStr: string;
}) {
  // 保険の「次の期限」は保険終期日(period_end)。既存の整備予定と同じ
  // getDueStatus(30日以内で期限間近)をそのまま再利用する。
  const status = getDueStatus(policy.period_end, todayDateStr);

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{policy.insurer_name}</p>
            <p className="text-muted-foreground">
              {INSURANCE_TYPE_LABEL[policy.insurance_type]}
            </p>
          </div>
          <Badge className={cn("shrink-0 whitespace-nowrap", DUE_STATUS_BADGE_CLASS[status])}>
            {DUE_STATUS_LABEL[status]}
          </Badge>
        </div>
        <p>
          保険期間: {formatMaintenanceDate(policy.period_start)} 〜{" "}
          {formatMaintenanceDate(policy.period_end)}
        </p>
        {policy.premium_cost !== null && (
          <p>
            保険料: {formatYen(policy.premium_cost)}(
            {INSURANCE_PAYMENT_FREQUENCY_LABEL[policy.payment_frequency]})
          </p>
        )}
        {policy.note && (
          <p className="whitespace-pre-wrap text-muted-foreground">
            {policy.note}
          </p>
        )}
        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/insurance/${policy.id}/edit`}>編集</Link>
          </Button>
          <DeleteInsurancePolicyButton
            id={policy.id}
            insurerName={policy.insurer_name}
          />
        </div>
      </CardContent>
    </Card>
  );
}
