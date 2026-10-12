import Link from "next/link";

import { formatMaintenanceDate } from "@/lib/maintenance-record";
import { formatYen as yen } from "@/lib/format";
import type { Loan } from "@/lib/loan";
import { summarizeLoan } from "@/lib/loan-calculation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteLoanButton } from "@/components/delete-loan-button";

function endDate(startDate: string, termMonths: number): string {
  const [year, month] = startDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + termMonths, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function LoanCard({ loan }: { loan: Loan }) {
  const summary = summarizeLoan(loan);

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6 text-sm">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 font-medium">{loan.lender_name}</p>
          {summary.isPaidOff && (
            <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
              完済
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          借入総額: {yen(loan.principal)} ・ 返済期間: {loan.term_months}ヶ月(
          {formatMaintenanceDate(loan.start_date)} 〜{" "}
          {formatMaintenanceDate(endDate(loan.start_date, loan.term_months))})
        </p>
        <p className="text-muted-foreground">
          年利: {summary.annualInterestRatePercent.toFixed(2)}%
          {loan.annual_interest_rate === null && "(月々支払額から算出)"} ・ 月々支払額:{" "}
          {yen(summary.monthlyPayment)}
          {loan.monthly_payment === null && "(年利から算出)"}
        </p>
        {summary.bonusPaymentAmount !== null && (
          <p className="text-muted-foreground">
            賞与払い: {summary.bonusMonth1}月・{summary.bonusMonth2}月に+
            {yen(summary.bonusPaymentAmount)}
          </p>
        )}
        {!summary.isPaidOff ? (
          <>
            <p>
              残高: {yen(summary.remainingBalance)}(残り{summary.remainingMonths}
              ヶ月)
            </p>
            <p>
              今日一括返済した場合に節約できる利息: {yen(summary.remainingInterest)}
            </p>
          </>
        ) : (
          <p>完済済みです。総利息: {yen(summary.totalInterest)}</p>
        )}
        {loan.note && (
          <p className="whitespace-pre-wrap text-muted-foreground">{loan.note}</p>
        )}
        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/loans/${loan.id}/edit`}>編集</Link>
          </Button>
          <DeleteLoanButton id={loan.id} lenderName={loan.lender_name} />
        </div>
      </CardContent>
    </Card>
  );
}
