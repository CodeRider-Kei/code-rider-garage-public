"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  CUSTOM_PART_BRAND_MAX_LENGTH,
  CUSTOM_PART_CATEGORIES,
  CUSTOM_PART_NAME_MAX_LENGTH,
  CUSTOM_PART_NOTE_MAX_LENGTH,
  CUSTOM_PART_SHOP_NAME_MAX_LENGTH,
  type CustomPart,
  type CustomPartFormState,
} from "@/lib/custom-part";
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

const initialState: CustomPartFormState = {};

type CustomPartAction = (
  prevState: CustomPartFormState,
  formData: FormData,
) => Promise<CustomPartFormState>;

export function CustomPartForm({
  motorcycleId,
  motorcycleName,
  currentMileage,
  action,
  part,
}: {
  motorcycleId: string;
  motorcycleName: string;
  currentMileage: number;
  action: CustomPartAction;
  part?: CustomPart;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {part ? "カスタムパーツを編集" : "カスタムパーツを登録"}
          </CardTitle>
          <CardDescription>{motorcycleName}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-6">
            {part && <input type="hidden" name="id" value={part.id} />}
            <p className="text-xs text-muted-foreground -mt-2">
              目安: 同一スペック・同等品への交換は「整備記録」に、社外品やワンランク上のグレードへの変更・追加はこちらの「カスタムパーツ」に記録してください。
            </p>
            <div className="grid gap-2">
              <Label htmlFor="part_name">パーツ名</Label>
              <Input
                id="part_name"
                name="part_name"
                required
                maxLength={CUSTOM_PART_NAME_MAX_LENGTH}
                defaultValue={part?.part_name}
                placeholder="例: マフラー"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">カテゴリー</Label>
              <NativeSelect
                id="category"
                name="category"
                required
                defaultValue={part?.category ?? ""}
              >
                <option value="" disabled>
                  選択してください
                </option>
                {CUSTOM_PART_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand">ブランド</Label>
              <Input
                id="brand"
                name="brand"
                maxLength={CUSTOM_PART_BRAND_MAX_LENGTH}
                defaultValue={part?.brand ?? ""}
                placeholder="任意"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shop_name">購入・施工店舗</Label>
              <Input
                id="shop_name"
                name="shop_name"
                maxLength={CUSTOM_PART_SHOP_NAME_MAX_LENGTH}
                defaultValue={part?.shop_name ?? ""}
                placeholder="任意"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="purchase_date">購入・取付日</Label>
              <Input
                id="purchase_date"
                name="purchase_date"
                type="date"
                required
                defaultValue={part?.purchase_date}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mileage">取付時走行距離(km)</Label>
              <Input
                id="mileage"
                name="mileage"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                defaultValue={part?.mileage ?? currentMileage}
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
                defaultValue={part?.cost ?? ""}
                placeholder="任意"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">メモ</Label>
              <Textarea
                id="note"
                name="note"
                maxLength={CUSTOM_PART_NOTE_MAX_LENGTH}
                defaultValue={part?.note ?? ""}
                placeholder="任意"
              />
            </div>
            {state.error && (
              <p role="alert" className="text-sm text-red-500">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? part
                  ? "更新中..."
                  : "登録中..."
                : part
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
