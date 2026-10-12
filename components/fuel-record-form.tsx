"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  FUEL_RECORD_NOTE_MAX_LENGTH,
  type FuelRecord,
  type FuelRecordFormState,
} from "@/lib/fuel-record";
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
import { Textarea } from "@/components/ui/textarea";

const initialState: FuelRecordFormState = {};

type FuelRecordAction = (
  prevState: FuelRecordFormState,
  formData: FormData,
) => Promise<FuelRecordFormState>;

export function FuelRecordForm({
  motorcycleId,
  motorcycleName,
  currentMileage,
  action,
  record,
}: {
  motorcycleId: string;
  motorcycleName: string;
  currentMileage: number;
  action: FuelRecordAction;
  record?: FuelRecord;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {record ? "給油記録を編集" : "給油記録を登録"}
          </CardTitle>
          <CardDescription>{motorcycleName}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-6">
            {record && <input type="hidden" name="id" value={record.id} />}
            <div className="grid gap-2">
              <Label htmlFor="filled_on">給油日</Label>
              <Input
                id="filled_on"
                name="filled_on"
                type="date"
                required
                defaultValue={record?.filled_on}
              />
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
              <p className="text-xs text-muted-foreground">
                入力すると、前回の満タン給油からの燃費(km/L)を自動計算します。
              </p>
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
              <Label htmlFor="liters">給油量(L)</Label>
              <Input
                id="liters"
                name="liters"
                type="number"
                inputMode="decimal"
                min={0.01}
                step={0.01}
                required
                defaultValue={record?.liters}
              />
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
            <div className="flex items-start gap-2">
              <Checkbox
                id="is_full_tank"
                name="is_full_tank"
                className="mt-0.5"
                defaultChecked={record?.is_full_tank ?? true}
              />
              <Label htmlFor="is_full_tank" className="font-normal">
                満タン給油
                <span className="block text-xs text-muted-foreground">
                  燃費計算は満タン給油同士の記録からのみ算出されます。
                </span>
              </Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">メモ</Label>
              <Textarea
                id="note"
                name="note"
                maxLength={FUEL_RECORD_NOTE_MAX_LENGTH}
                defaultValue={record?.note ?? ""}
                placeholder="任意"
              />
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
          href={`/motorcycles/${motorcycleId}`}
          className="underline underline-offset-4"
        >
          バイク詳細に戻る
        </Link>
      </div>
    </div>
  );
}
