"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  LOAN_LENDER_NAME_MAX_LENGTH,
  LOAN_NOTE_MAX_LENGTH,
  type Loan,
  type LoanFormState,
} from "@/lib/loan";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

const initialState: LoanFormState = {};

type LoanAction = (
  prevState: LoanFormState,
  formData: FormData,
) => Promise<LoanFormState>;

type InputMode = "rate" | "payment";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export function LoanForm({
  motorcycleId,
  motorcycleName,
  action,
  loan,
}: {
  motorcycleId: string;
  motorcycleName: string;
  action: LoanAction;
  loan?: Loan;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [inputMode, setInputMode] = useState<InputMode>(
    loan?.monthly_payment !== null && loan !== undefined ? "payment" : "rate",
  );
  const [useBonusPayment, setUseBonusPayment] = useState(
    loan?.bonus_payment_amount !== null && loan !== undefined,
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {loan ? "ローンを編集" : "ローンを登録"}
          </CardTitle>
          <CardDescription>{motorcycleName}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-6">
            {loan && <input type="hidden" name="id" value={loan.id} />}
            <div className="grid gap-2">
              <Label htmlFor="lender_name">借入先</Label>
              <Input
                id="lender_name"
                name="lender_name"
                required
                maxLength={LOAN_LENDER_NAME_MAX_LENGTH}
                defaultValue={loan?.lender_name}
                placeholder="例: ○○銀行、△△クレジット"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="principal">借入総額(円)</Label>
              <Input
                id="principal"
                name="principal"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                defaultValue={loan?.principal}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="term_months">返済期間(ヶ月)</Label>
              <Input
                id="term_months"
                name="term_months"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                defaultValue={loan?.term_months}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="start_date">借入日</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                required
                defaultValue={loan?.start_date}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="input_mode">入力方法</Label>
              <NativeSelect
                id="input_mode"
                value={inputMode}
                onChange={(e) => setInputMode(e.target.value as InputMode)}
              >
                <option value="rate">年利で入力</option>
                <option value="payment">月々支払額で入力</option>
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                入力しなかった方は、もう一方の値から自動計算されます。
              </p>
            </div>
            {inputMode === "rate" ? (
              <div className="grid gap-2">
                <Label htmlFor="annual_interest_rate">年利(%)</Label>
                <Input
                  id="annual_interest_rate"
                  name="annual_interest_rate"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  required
                  defaultValue={loan?.annual_interest_rate ?? ""}
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="monthly_payment">月々支払額(円)</Label>
                <Input
                  id="monthly_payment"
                  name="monthly_payment"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  required
                  defaultValue={loan?.monthly_payment ?? ""}
                />
              </div>
            )}
            <div className="flex items-start gap-2">
              <Checkbox
                id="use_bonus_payment"
                className="mt-0.5"
                checked={useBonusPayment}
                onCheckedChange={(checked) => setUseBonusPayment(checked === true)}
              />
              <Label htmlFor="use_bonus_payment" className="font-normal">
                賞与払いを利用する
                <span className="block text-xs text-muted-foreground">
                  年2回、指定した月に毎月の返済額へ加算して支払う場合にチェックしてください。
                </span>
              </Label>
            </div>
            {useBonusPayment && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="bonus_payment_amount">賞与月の加算額(円)</Label>
                  <Input
                    id="bonus_payment_amount"
                    name="bonus_payment_amount"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    required
                    defaultValue={loan?.bonus_payment_amount ?? ""}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label htmlFor="bonus_month_1">賞与月1</Label>
                    <NativeSelect
                      id="bonus_month_1"
                      name="bonus_month_1"
                      required
                      defaultValue={loan?.bonus_month_1 ?? ""}
                    >
                      <option value="" disabled>
                        選択してください
                      </option>
                      {MONTH_OPTIONS.map((month) => (
                        <option key={month} value={month}>
                          {month}月
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bonus_month_2">賞与月2</Label>
                    <NativeSelect
                      id="bonus_month_2"
                      name="bonus_month_2"
                      required
                      defaultValue={loan?.bonus_month_2 ?? ""}
                    >
                      <option value="" disabled>
                        選択してください
                      </option>
                      {MONTH_OPTIONS.map((month) => (
                        <option key={month} value={month}>
                          {month}月
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              </>
            )}
            <div className="grid gap-2">
              <Label htmlFor="note">メモ</Label>
              <Textarea
                id="note"
                name="note"
                maxLength={LOAN_NOTE_MAX_LENGTH}
                defaultValue={loan?.note ?? ""}
                placeholder="任意"
              />
            </div>
            {state.error && (
              <p role="alert" className="text-sm text-red-500">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? loan
                  ? "更新中..."
                  : "登録中..."
                : loan
                  ? "更新する"
                  : "登録する"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="text-center text-sm">
        <Link
          href={`/motorcycles/${motorcycleId}`}
          className="underline underline-offset-4"
        >
          バイク詳細に戻る
        </Link>
      </div>
    </div>
  );
}
