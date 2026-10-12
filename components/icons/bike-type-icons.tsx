import type { CSSProperties } from "react";

// バイクタイプごとのアイコン。
// 実体(トレース済みのSVGパス)は public/icons/bike-types/*.svg に
// 1タイプ1ファイルで保存されている(このファイルには巨大なpathを持たない)。
// 単色SVG(fill="currentColor")をCSS mask-imageとして読み込み、
// background-color: currentColor で塗ることで呼び出し側の文字色をそのまま反映する。

export type BikeTypeIconProps = {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
};

function maskIcon(fileName: string) {
  return function Icon({ size = 24, className, style }: BikeTypeIconProps) {
    const url = `/icons/bike-types/${fileName}.svg`;
    return (
      <span
        aria-hidden="true"
        className={className}
        style={{
          display: "inline-block",
          width: size,
          height: size,
          backgroundColor: "currentColor",
          WebkitMaskImage: `url(${url})`,
          maskImage: `url(${url})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          ...style,
        }}
      />
    );
  };
}

export const NakedBikeIcon = maskIcon("naked");
export const CruiserBikeIcon = maskIcon("cruiser");
export const FullFairingBikeIcon = maskIcon("full-fairing");
export const OffRoadBikeIcon = maskIcon("off-road");
export const AdventureBikeIcon = maskIcon("adventure");
export const ScooterIcon = maskIcon("scooter");
export const StreetFighterBikeIcon = maskIcon("streetfighter");
export const ClassicBikeIcon = maskIcon("classic");
