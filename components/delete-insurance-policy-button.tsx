"use client";

import { deleteInsurancePolicy } from "@/app/insurance/[id]/actions";
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

export function DeleteInsurancePolicyButton({
  id,
  insurerName,
}: {
  id: string;
  insurerName: string;
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
          <AlertDialogTitle>「{insurerName}」の保険情報を削除しますか?</AlertDialogTitle>
          <AlertDialogDescription>
            この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <form action={deleteInsurancePolicy}>
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
