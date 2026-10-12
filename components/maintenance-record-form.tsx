"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_NOTE_MAX_LENGTH,
  type MaintenanceRecord,
  type MaintenanceRecordFormState,
} from "@/lib/maintenance-record";
import {
  MAINTENANCE_CYCLE_SETTING_ITEM_NAME_MAX_LENGTH,
  type MaintenanceCycleSetting,
} from "@/lib/maintenance-cycle-setting";
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

const initialState: MaintenanceRecordFormState = {};

type MaintenanceRecordAction = (
  prevState: MaintenanceRecordFormState,
  formData: FormData,
) => Promise<MaintenanceRecordFormState>;

function formatCycleSettingOptionLabel(setting: MaintenanceCycleSetting) {
  const parts: string[] = [];
  if (setting.distance_interval_km !== null) {
    parts.push(`${setting.distance_interval_km.toLocaleString("ja-JP")}kmごと`);
  }
  if (setting.period_interval_months !== null) {
    parts.push(`${setting.period_interval_months}か月ごと`);
  }
  return parts.length > 0
    ? `${setting.item_name}(${parts.join("・")})`
    : setting.item_name;
}

export function MaintenanceRecordForm({
  motorcycleId,
  motorcycleName,
  currentMileage,
  action,
  record,
  cycleSettings,
}: {
  motorcycleId: string;
  motorcycleName: string;
  currentMileage: number;
  action: MaintenanceRecordAction;
  record?: MaintenanceRecord;
  cycleSettings: MaintenanceCycleSetting[];
}) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialState,
  );

  const originalCycleSettingId = record?.cycle_setting_id ?? "";
  const [selectedCycleSettingId, setSelectedCycleSettingId] = useState(
    originalCycleSettingId,
  );
  const [selectedCategory, setSelectedCategory] = useState(
    record?.category ?? "",
  );

  // サイクル設定はカテゴリーが一致するものだけを選択肢にする。
  // カテゴリー未選択時は「設定しない」のみ選択可能とする。
  const filteredCycleSettings = useMemo(
    () => cycleSettings.filter((s) => s.category === selectedCategory),
    [cycleSettings, selectedCategory],
  );

  const selectedSetting = useMemo(
    () => cycleSettings.find((s) => s.id === selectedCycleSettingId) ?? null,
    [cycleSettings, selectedCycleSettingId],
  );

  // 選択中のサイクル設定が「編集対象の記録に元々紐づいていたもの」と同じ場合は、
  // 記録に保存済みのスナップショット値を初期値にする(前回保存した内容を維持)。
  // 新規選択・別設定への切り替え時は、そのサイクル設定の現在値を初期値にする。
  const usingOriginalSnapshot = selectedCycleSettingId === originalCycleSettingId;
  const defaultItemName = usingOriginalSnapshot
    ? record?.item_name ?? selectedSetting?.item_name ?? ""
    : (selectedSetting?.item_name ?? "");
  const defaultDistanceInterval = usingOriginalSnapshot
    ? (record?.distance_interval_km ?? selectedSetting?.distance_interval_km ?? "")
    : (selectedSetting?.distance_interval_km ?? "");
  const defaultPeriodInterval = usingOriginalSnapshot
    ? (record?.period_interval_months ?? selectedSetting?.period_interval_months ?? "")
    : (selectedSetting?.period_interval_months ?? "");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {record ? "整備記録を編集" : "整備記録を追加"}
          </CardTitle>
          <CardDescription>{motorcycleName}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-6">
            {record && <input type="hidden" name="id" value={record.id} />}
            <div className="grid gap-2">
              <Label htmlFor="maintenance_date">整備日</Label>
              <Input
                id="maintenance_date"
                name="maintenance_date"
                type="date"
                required
                defaultValue={record?.maintenance_date}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">カテゴリー</Label>
              <NativeSelect
                id="category"
                name="category"
                required
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedCycleSettingId("");
                }}
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
              <Label htmlFor="mileage">走行距離(km)</Label>
              <Input
                id="mileage"
                name="mileage"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                defaultValue={record?.mileage ?? currentMileage}
                placeholder="任意"
              />
              {state.needsConfirmation && (
                <div className="flex items-start gap-2 pt-1">
                  <Checkbox id="force" name="force" className="mt-0.5" />
                  <Label
                    htmlFor="force"
                    className="text-xs font-normal text-muted-foreground"
                  >
                    現在の走行距離より小さい値でも登録する
                  </Label>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cost">費用(円)</Label>
              <Input
                id="cost"
                name="cost"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                defaultValue={record?.cost ?? ""}
                placeholder="任意"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">メモ</Label>
              <Textarea
                id="note"
                name="note"
                maxLength={MAINTENANCE_NOTE_MAX_LENGTH}
                defaultValue={record?.note ?? ""}
                placeholder="任意"
              />
            </div>

            <div className="flex flex-col gap-4 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">次回整備時期(任意)</p>
                <p className="text-xs text-muted-foreground">
                  サイクル設定を選ぶと項目名・距離間隔・期間間隔が自動入力されます。今回だけ内容を変更することもできます。設定しない場合は整備記録のみ保存され、既存の予定は変更されません。
                </p>
              </div>

              {cycleSettings.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  整備サイクル設定がまだありません。バイク詳細画面から登録できます。
                </p>
              ) : selectedCategory === "" ? (
                <div className="grid gap-2">
                  <Label htmlFor="cycle_setting_id">サイクル設定</Label>
                  <NativeSelect
                    id="cycle_setting_id"
                    name="cycle_setting_id"
                    value=""
                    disabled
                  >
                    <option value="">設定しない</option>
                  </NativeSelect>
                  <p className="text-xs text-muted-foreground">
                    カテゴリーを選択すると、そのカテゴリーのサイクル設定を選べます。
                  </p>
                </div>
              ) : filteredCycleSettings.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  このカテゴリーの整備サイクル設定がまだありません。バイク詳細画面から登録できます。
                </p>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="cycle_setting_id">サイクル設定</Label>
                  <NativeSelect
                    id="cycle_setting_id"
                    name="cycle_setting_id"
                    value={selectedCycleSettingId}
                    onChange={(e) => setSelectedCycleSettingId(e.target.value)}
                  >
                    <option value="">設定しない</option>
                    {filteredCycleSettings.map((setting) => (
                      <option key={setting.id} value={setting.id}>
                        {formatCycleSettingOptionLabel(setting)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              )}

              {selectedCycleSettingId && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="item_name">項目名</Label>
                    <Input
                      key={`item_name-${selectedCycleSettingId}`}
                      id="item_name"
                      name="item_name"
                      required
                      maxLength={MAINTENANCE_CYCLE_SETTING_ITEM_NAME_MAX_LENGTH}
                      defaultValue={defaultItemName}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="distance_interval_km">
                      次回までの走行距離(km)
                    </Label>
                    <Input
                      key={`distance-${selectedCycleSettingId}`}
                      id="distance_interval_km"
                      name="distance_interval_km"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      defaultValue={defaultDistanceInterval}
                      placeholder="任意"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="period_interval_months">
                      次回までの期間(か月)
                    </Label>
                    <Input
                      key={`period-${selectedCycleSettingId}`}
                      id="period_interval_months"
                      name="period_interval_months"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      defaultValue={defaultPeriodInterval}
                      placeholder="任意"
                    />
                  </div>
                </>
              )}
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-red-500">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? record
                  ? "更新中..."
                  : "登録中..."
                : record
                  ? "更新する"
                  : "登録する"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="text-center text-sm">
        <Link
          href={
            record ? `/maintenance/${record.id}` : `/motorcycles/${motorcycleId}`
          }
          className="underline underline-offset-4"
        >
          詳細に戻る
        </Link>
      </div>
    </div>
  );
}
