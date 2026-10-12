"use client";

import { deleteMaintenanceRecord } from "@/app/maintenance/[id]/actions";
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

export function DeleteMaintenanceRecordButton({ id }: { id: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" className="flex-1">
          削除する
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>この整備記録を削除しますか?</AlertDialogTitle>
          <AlertDialogDescription>
            この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <form action={deleteMaintenanceRecord}>
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
