"use client";

import { useActionState } from "react";

import type { UpdateMileageFormState } from "@/lib/motorcycle";
import { formatMaintenanceDate } from "@/lib/maintenance-record";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: UpdateMileageFormState = {};

type UpdateMileageAction = (
  prevState: UpdateMileageFormState,
  formData: FormData,
) => Promise<UpdateMileageFormState>;

export function QuickMileageUpdateButton({
  currentMileage,
  mileageRecordedOn,
  action,
  size = "sm",
}: {
  currentMileage: number;
  mileageRecordedOn: string;
  action: UpdateMileageAction;
  size?: "sm" | "default";
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={(e) => e.stopPropagation()}
        >
          走行距離を更新
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>走行距離を更新</AlertDialogTitle>
          <AlertDialogDescription>
            現在の記録: {currentMileage.toLocaleString("ja-JP")} km
            ({formatMaintenanceDate(mileageRecordedOn)}時点)
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="mileage">新しい走行距離(km)</Label>
            <Input
              id="mileage"
              name="mileage"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              required
              defaultValue={currentMileage}
            />
          </div>
          {state.needsConfirmation && (
            <div className="flex items-start gap-2">
              <Checkbox id="force" name="force" className="mt-0.5" />
              <Label
                htmlFor="force"
                className="text-xs font-normal text-muted-foreground"
              >
                現在の記録より小さい値でも更新する
              </Label>
            </div>
          )}
          {state.error && <p role="alert" className="text-sm text-red-500">{state.error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <Button type="submit" disabled={isPending}>
              {isPending ? "更新中..." : "更新する"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
