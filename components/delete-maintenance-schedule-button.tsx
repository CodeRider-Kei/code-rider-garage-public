"use client";

import { deleteMaintenanceSchedule } from "@/app/schedules/[id]/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 自動予定(サイクル設定連動)は個別の終了操作を持たない。
// 削除できるのは手動作成の予定のみ(自動予定はサイクル設定を削除すると連動して消える)。
export function DeleteMaintenanceScheduleButton({
  id,
  itemName,
}: {
  id: string;
  itemName: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          削除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>「{itemName}」の整備予定を削除しますか?</AlertDialogTitle>
          <AlertDialogDescription>
            この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <form action={deleteMaintenanceSchedule}>
            <input type="hidden" name="id" value={id} />
            <AlertDialogAction
              type="submit"
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              削除する
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
