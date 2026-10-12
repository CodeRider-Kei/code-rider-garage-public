"use client";

import { deleteAccount } from "@/app/account/actions";
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

export function DeleteAccountButton() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" className="w-full">
          退会する
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>本当に退会しますか?</AlertDialogTitle>
          <AlertDialogDescription>
            この操作は取り消せません。登録したすべてのバイク情報・整備記録・アカウント情報が完全に削除されます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <form action={deleteAccount}>
            <AlertDialogAction
              type="submit"
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              退会する
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
