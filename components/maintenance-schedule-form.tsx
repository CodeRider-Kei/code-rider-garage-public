"use client";

import Link from "next/link";
import { useActionState } from "react";

import { MAINTENANCE_CATEGORIES } from "@/lib/maintenance-record";
import {
  MAINTENANCE_SCHEDULE_ITEM_NAME_MAX_LENGTH,
  MAINTENANCE_SCHEDULE_NOTE_MAX_LENGTH,
  type MaintenanceSchedule,
  type MaintenanceScheduleFormState,
} from "@/lib/maintenance-schedule";
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

const initialState: MaintenanceScheduleFormState = {};

type MaintenanceScheduleAction = (
  prevState: MaintenanceScheduleFormState,
  formData: FormData,
) => Promise<MaintenanceScheduleFormState>;

export function MaintenanceScheduleForm({
  motorcycleId,
  motorcycleName,
  action,
  schedule,
}: {
  motorcycleId: string;
  motorcycleName: string;
  action: MaintenanceScheduleAction;
  schedule?: MaintenanceSchedule;
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
            {schedule ? "整備予定を編集" : "整備予定を追加"}
          </CardTitle>
          <CardDescription>{motorcycleName}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-6">
            {schedule && <input type="hidden" name="id" value={schedule.id} />}
            <div className="grid gap-2">
              <Label htmlFor="item_name">整備項目名</Label>
              <Input
                id="item_name"
                name="item_name"
                required
                maxLength={MAINTENANCE_SCHEDULE_ITEM_NAME_MAX_LENGTH}
                defaultValue={schedule?.item_name}
                placeholder="例: フロントタイヤ交換"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">カテゴリー</Label>
              <NativeSelect
                id="category"
                name="category"
                required
                defaultValue={schedule?.category ?? ""}
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
              <Label htmlFor="next_due_date">次回予定日</Label>
              <Input
                id="next_due_date"
                name="next_due_date"
                type="date"
                required
                defaultValue={schedule?.next_due_date ?? undefined}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">メモ</Label>
              <Textarea
                id="note"
                name="note"
                maxLength={MAINTENANCE_SCHEDULE_NOTE_MAX_LENGTH}
                defaultValue={schedule?.note ?? ""}
                placeholder="任意"
              />
            </div>
            {state.error && (
              <p role="alert" className="text-sm text-red-500">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? schedule
                  ? "更新中..."
                  : "登録中..."
                : schedule
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
