"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createMotorcycle } from "@/app/motorcycles/new/actions";
import { updateMotorcycle } from "@/app/motorcycles/[id]/edit/actions";
import {
  BIKE_TYPES,
  ICON_COLORS,
  MOTORCYCLE_MANUFACTURER_MAX_LENGTH,
  MOTORCYCLE_MODEL_MAX_LENGTH,
  MOTORCYCLE_NAME_MAX_LENGTH,
  type BikeType,
  type IconColor,
  type Motorcycle,
  type MotorcycleFormState,
} from "@/lib/motorcycle";
import {
  BIKE_TYPE_LABEL,
  ICON_COLOR_LABEL,
  ICON_COLOR_SWATCH_CLASS,
  MotorcycleTypeIcon,
} from "@/components/motorcycle-type-icon";
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

const initialState: MotorcycleFormState = {};

export function MotorcycleForm({ motorcycle }: { motorcycle?: Motorcycle }) {
  const action = motorcycle ? updateMotorcycle : createMotorcycle;
  const [state, formAction, isPending] = useActionState(
    action,
    initialState,
  );
  const [bikeType, setBikeType] = useState<BikeType | "">(
    motorcycle?.bike_type ?? "",
  );
  const [iconColor, setIconColor] = useState<IconColor | "">(
    motorcycle?.icon_color ?? "",
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {motorcycle ? "バイク情報を編集" : "バイクを登録"}
          </CardTitle>
          <CardDescription>
            {motorcycle
              ? "変更する内容を入力してください"
              : "愛車の情報を入力してください"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-6">
            {motorcycle && (
              <input type="hidden" name="id" value={motorcycle.id} />
            )}
            <div className="grid gap-2">
              <Label htmlFor="name">表示名</Label>
              <Input
                id="name"
                name="name"
                required
                maxLength={MOTORCYCLE_NAME_MAX_LENGTH}
                defaultValue={motorcycle?.name}
                placeholder="例: マイCB400"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="manufacturer">メーカー</Label>
              <Input
                id="manufacturer"
                name="manufacturer"
                maxLength={MOTORCYCLE_MANUFACTURER_MAX_LENGTH}
                defaultValue={motorcycle?.manufacturer ?? ""}
                placeholder="例: ホンダ"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model">モデル</Label>
              <Input
                id="model"
                name="model"
                maxLength={MOTORCYCLE_MODEL_MAX_LENGTH}
                defaultValue={motorcycle?.model ?? ""}
                placeholder="例: CB400SF"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="current_mileage">現在の走行距離(km)</Label>
              <Input
                id="current_mileage"
                name="current_mileage"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                defaultValue={motorcycle?.current_mileage ?? 0}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="displacement_cc">排気量(cc)</Label>
              <Input
                id="displacement_cc"
                name="displacement_cc"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                defaultValue={motorcycle?.displacement_cc ?? ""}
                placeholder="任意"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bike_type">バイクタイプ</Label>
              <NativeSelect
                id="bike_type"
                name="bike_type"
                value={bikeType}
                onChange={(e) => setBikeType(e.target.value as BikeType | "")}
              >
                <option value="">選択しない</option>
                {BIKE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {BIKE_TYPE_LABEL[type]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium leading-none">
                アイコンカラー
              </span>
              <div
                role="radiogroup"
                aria-label="アイコンカラー"
                className="flex flex-wrap gap-3"
              >
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="icon_color"
                    value=""
                    checked={iconColor === ""}
                    onChange={() => setIconColor("")}
                    className="peer sr-only"
                  />
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-input text-[10px] text-muted-foreground peer-checked:ring-2 peer-checked:ring-ring peer-checked:ring-offset-2 peer-checked:ring-offset-background">
                    なし
                  </span>
                </label>
                {ICON_COLORS.map((color) => (
                  <label key={color} className="cursor-pointer">
                    <input
                      type="radio"
                      name="icon_color"
                      value={color}
                      checked={iconColor === color}
                      onChange={() => setIconColor(color)}
                      className="peer sr-only"
                    />
                    <span className="sr-only">{ICON_COLOR_LABEL[color]}</span>
                    <span
                      aria-hidden="true"
                      title={ICON_COLOR_LABEL[color]}
                      className={`block h-9 w-9 rounded-full border border-border peer-checked:ring-2 peer-checked:ring-ring peer-checked:ring-offset-2 peer-checked:ring-offset-background ${ICON_COLOR_SWATCH_CLASS[color]}`}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium leading-none">
                プレビュー
              </span>
              <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-input">
                {bikeType ? (
                  <MotorcycleTypeIcon
                    bikeType={bikeType}
                    iconColor={iconColor || null}
                    size={40}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    バイクタイプを選択するとアイコンが表示されます
                  </p>
                )}
              </div>
            </div>
            {state.error && (
              <p role="alert" className="text-sm text-red-500">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? motorcycle
                  ? "更新中..."
                  : "登録中..."
                : motorcycle
                  ? "更新する"
                  : "登録する"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="text-center text-sm">
        <Link
          href={motorcycle ? `/motorcycles/${motorcycle.id}` : "/dashboard"}
          className="underline underline-offset-4"
        >
          {motorcycle ? "詳細に戻る" : "ダッシュボードに戻る"}
        </Link>
      </div>
    </div>
  );
}
