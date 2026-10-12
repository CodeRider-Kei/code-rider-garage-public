"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  INSURANCE_INSURER_NAME_MAX_LENGTH,
  INSURANCE_NOTE_MAX_LENGTH,
  INSURANCE_PAYMENT_FREQUENCIES,
  INSURANCE_PAYMENT_FREQUENCY_LABEL,
  INSURANCE_TYPES,
  INSURANCE_TYPE_LABEL,
  type InsurancePolicy,
  type InsurancePolicyFormState,
} from "@/lib/insurance";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

const initialState: InsurancePolicyFormState = {};

type InsurancePolicyAction = (
  prevState: InsurancePolicyFormState,
  formData: FormData,
) => Promise<InsurancePolicyFormState>;

export function InsurancePolicyForm({
  motorcycleId,
  motorcycleName,
  action,
  policy,
}: {
  motorcycleId: string;
  motorcycleName: string;
  action: InsurancePolicyAction;
  policy?: InsurancePolicy;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {policy ? "保険情報を編集" : "保険情報を登録"}
          </CardTitle>
          <CardDescription>{motorcycleName}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-6">
            {policy && <input type="hidden" name="id" value={policy.id} />}
            <div className="grid gap-2">
              <Label htmlFor="insurance_type">保険の種類</Label>
              <NativeSelect
                id="insurance_type"
                name="insurance_type"
                required
                defaultValue={policy?.insurance_type ?? ""}
              >
                <option value="" disabled>
                  選択してください
                </option>
                {INSURANCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {INSURANCE_TYPE_LABEL[type]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="insurer_name">保険会社名</Label>
              <Input
                id="insurer_name"
                name="insurer_name"
                required
                maxLength={INSURANCE_INSURER_NAME_MAX_LENGTH}
                defaultValue={policy?.insurer_name}
                placeholder="例: ○○損害保険"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment_frequency">支払い頻度</Label>
              <NativeSelect
                id="payment_frequency"
                name="payment_frequency"
                required
                defaultValue={policy?.payment_frequency ?? ""}
              >
                <option value="" disabled>
                  選択してください
                </option>
                {INSURANCE_PAYMENT_FREQUENCIES.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {INSURANCE_PAYMENT_FREQUENCY_LABEL[frequency]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="premium_cost">保険料(円)</Label>
              <Input
                id="premium_cost"
                name="premium_cost"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                defaultValue={policy?.premium_cost ?? ""}
                placeholder="任意"
              />
              <p className="text-xs text-muted-foreground">
                選択した支払い頻度あたりの金額を入力してください(月払いなら月額、年払いなら年額)。
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="period_start">保険始期日</Label>
              <Input
                id="period_start"
                name="period_start"
                type="date"
                required
                defaultValue={policy?.period_start}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="period_end">保険終期日</Label>
              <Input
                id="period_end"
                name="period_end"
                type="date"
                required
                defaultValue={policy?.period_end}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">メモ</Label>
              <Textarea
                id="note"
                name="note"
                maxLength={INSURANCE_NOTE_MAX_LENGTH}
                defaultValue={policy?.note ?? ""}
                placeholder="例: 対人無制限・対物2000万・車両保険あり、など補償内容の詳細"
              />
            </div>
            {state.error && (
              <p role="alert" className="text-sm text-red-500">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? policy
                  ? "更新中..."
                  : "登録中..."
                : policy
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
