"use client";

import Link from "next/link";
import { useActionState } from "react";

import { MAINTENANCE_CATEGORIES } from "@/lib/maintenance-record";
import {
  MAINTENANCE_CYCLE_SETTING_ITEM_NAME_MAX_LENGTH,
  type MaintenanceCycleSetting,
  type MaintenanceCycleSettingFormState,
} from "@/lib/maintenance-cycle-setting";
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

const initialState: MaintenanceCycleSettingFormState = {};

type MaintenanceCycleSettingAction = (
  prevState: MaintenanceCycleSettingFormState,
  formData: FormData,
) => Promise<MaintenanceCycleSettingFormState>;

export function MaintenanceCycleSettingForm({
  motorcycleId,
  motorcycleName,
  action,
  setting,
}: {
  motorcycleId: string;
  motorcycleName: string;
  action: MaintenanceCycleSettingAction;
  setting?: MaintenanceCycleSetting;
}) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialState,
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {setting ? "整備サイクル設定を編集" : "整備サイクル設定を追加"}
          </CardTitle>
          <CardDescription>{motorcycleName}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-6">
            {setting && <input type="hidden" name="id" value={setting.id} />}
            <div className="grid gap-2">
              <Label htmlFor="item_name">整備項目名</Label>
              <Input
                id="item_name"
                name="item_name"
                required
                maxLength={MAINTENANCE_CYCLE_SETTING_ITEM_NAME_MAX_LENGTH}
                defaultValue={setting?.item_name}
                placeholder="例: エンジンオイル交換"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">カテゴリー</Label>
              <NativeSelect
                id="category"
                name="category"
                required
                defaultValue={setting?.category ?? ""}
              >
                <option value="" disabled>
                  選択してください
                </option>
                {MAINTENANCE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="distance_interval_km">距離間隔(km)</Label>
              <Input
                id="distance_interval_km"
                name="distance_interval_km"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                defaultValue={setting?.distance_interval_km ?? ""}
                placeholder="例: 3000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="period_interval_months">期間間隔(か月)</Label>
              <Input
                id="period_interval_months"
                name="period_interval_months"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                defaultValue={setting?.period_interval_months ?? ""}
                placeholder="例: 6"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              距離間隔・期間間隔は少なくとも一方を入力してください。両方入力した場合は、整備記録の保存時にどちらか早く到達した時点を目安とします。
            </p>
            {state.error && (
              <p role="alert" className="text-sm text-red-500">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? setting
                  ? "更新中..."
                  : "登録中..."
                : setting
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
