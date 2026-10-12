import type { ComponentType } from "react";

import {
  AdventureBikeIcon,
  type BikeTypeIconProps,
  ClassicBikeIcon,
  CruiserBikeIcon,
  FullFairingBikeIcon,
  NakedBikeIcon,
  OffRoadBikeIcon,
  ScooterIcon,
  StreetFighterBikeIcon,
} from "@/components/icons/bike-type-icons";
import type { BikeType, IconColor } from "@/lib/motorcycle";
import { cn } from "@/lib/utils";

// 保存値(固定キー)から日本語表示名への変換はここに集約する。
export const BIKE_TYPE_LABEL: Record<BikeType, string> = {
  naked: "ネイキッド",
  cruiser: "アメリカン",
  full_fairing: "フルカウル",
  off_road: "オフロード",
  adventure: "アドベンチャー",
  scooter: "スクーター",
  streetfighter: "ストリートファイター",
  classic: "クラシック",
};

// タイプごとの専用線画アイコン(components/icons/bike-type-icons.tsx)。
const BIKE_TYPE_ICON: Record<BikeType, ComponentType<BikeTypeIconProps>> = {
  naked: NakedBikeIcon,
  cruiser: CruiserBikeIcon,
  full_fairing: FullFairingBikeIcon,
  off_road: OffRoadBikeIcon,
  adventure: AdventureBikeIcon,
  scooter: ScooterIcon,
  streetfighter: StreetFighterBikeIcon,
  classic: ClassicBikeIcon,
};

export const ICON_COLOR_LABEL: Record<IconColor, string> = {
  red: "赤",
  orange: "オレンジ",
  amber: "黄",
  green: "緑",
  teal: "ティール",
  blue: "青",
  purple: "紫",
  slate: "グレー",
};

// アイコン(線・塗り)用: ライト/ダークどちらの背景でも視認できるよう濃淡を切り替える。
// このファイルはTailwindのcontentスキャン対象(components/**)に含まれるため、
// クラス名はここに文字列として明示する(lib/配下に置くとJITに検出されない)。
const ICON_COLOR_TEXT_CLASS: Record<IconColor, string> = {
  red: "text-red-600 dark:text-red-400",
  orange: "text-orange-600 dark:text-orange-400",
  amber: "text-amber-600 dark:text-amber-400",
  green: "text-green-600 dark:text-green-400",
  teal: "text-teal-600 dark:text-teal-400",
  blue: "text-blue-600 dark:text-blue-400",
  purple: "text-purple-600 dark:text-purple-400",
  slate: "text-slate-600 dark:text-slate-400",
};

// カラー選択UI(スウォッチ)用の塗りつぶし背景色。
export const ICON_COLOR_SWATCH_CLASS: Record<IconColor, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  green: "bg-green-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  slate: "bg-slate-500",
};

export function MotorcycleTypeIcon({
  bikeType,
  iconColor,
  size = 18,
  className,
}: {
  bikeType: BikeType;
  iconColor: IconColor | null;
  size?: number;
  className?: string;
}) {
  const Icon = BIKE_TYPE_ICON[bikeType];
  const colorClass = iconColor
    ? ICON_COLOR_TEXT_CLASS[iconColor]
    : "text-muted-foreground";

  return <Icon size={size} className={cn(colorClass, className)} />;
}
