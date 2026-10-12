"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  BIKE_TYPES,
  ICON_COLORS,
  MOTORCYCLE_MANUFACTURER_MAX_LENGTH,
  MOTORCYCLE_MODEL_MAX_LENGTH,
  MOTORCYCLE_NAME_MAX_LENGTH,
  type BikeType,
  type IconColor,
  type MotorcycleFormState,
} from "@/lib/motorcycle";
import { getTodayDateString } from "@/lib/maintenance-schedule";

export async function updateMotorcycle(
  _prevState: MotorcycleFormState,
  formData: FormData,
): Promise<MotorcycleFormState> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();
  const user = userData?.claims;

  if (userError || !user) {
    redirect("/auth/login");
  }

  const userId = user.sub as string;
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { error: "対象のバイクが見つかりません。" };
  }

  // 所有権確認: 存在しない場合と他人のバイクの場合を区別せず、
  // 同一の汎用メッセージを返す(情報を外部に漏らさない)。
  const { data: existing } = await supabase
    .from("motorcycles")
    .select("id, current_mileage")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    return { error: "対象のバイクが見つかりません。" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const manufacturer = String(formData.get("manufacturer") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const mileageRaw = String(formData.get("current_mileage") ?? "").trim();

  if (!name) {
    return { error: "表示名を入力してください。" };
  }

  if (name.length > MOTORCYCLE_NAME_MAX_LENGTH) {
    return { error: `表示名は${MOTORCYCLE_NAME_MAX_LENGTH}文字以内で入力してください。` };
  }

  if (manufacturer.length > MOTORCYCLE_MANUFACTURER_MAX_LENGTH) {
    return { error: `メーカーは${MOTORCYCLE_MANUFACTURER_MAX_LENGTH}文字以内で入力してください。` };
  }

  if (model.length > MOTORCYCLE_MODEL_MAX_LENGTH) {
    return { error: `モデルは${MOTORCYCLE_MODEL_MAX_LENGTH}文字以内で入力してください。` };
  }

  const currentMileage = mileageRaw === "" ? 0 : Number(mileageRaw);
  if (!Number.isInteger(currentMileage) || currentMileage < 0) {
    return { error: "現在の走行距離は0以上の整数で入力してください。" };
  }

  const displacementRaw = String(formData.get("displacement_cc") ?? "").trim();
  let displacementCc: number | null = null;
  if (displacementRaw !== "") {
    displacementCc = Number(displacementRaw);
    if (!Number.isInteger(displacementCc) || displacementCc <= 0) {
      return { error: "排気量は1以上の整数(cc)で入力してください。" };
    }
  }

  const bikeTypeRaw = String(formData.get("bike_type") ?? "").trim();
  let bikeType: BikeType | null = null;
  if (bikeTypeRaw !== "") {
    if (!BIKE_TYPES.includes(bikeTypeRaw as BikeType)) {
      return { error: "バイクタイプの指定が正しくありません。" };
    }
    bikeType = bikeTypeRaw as BikeType;
  }

  const iconColorRaw = String(formData.get("icon_color") ?? "").trim();
  let iconColor: IconColor | null = null;
  if (iconColorRaw !== "") {
    if (!ICON_COLORS.includes(iconColorRaw as IconColor)) {
      return { error: "アイコンカラーの指定が正しくありません。" };
    }
    iconColor = iconColorRaw as IconColor;
  }

  // 走行距離は「日々更新される値」ではないため、実際に値が変わった場合のみ
  // 「入力時点」の日付(mileage_recorded_on)を更新する。変わっていなければ、
  // 古い入力時点の情報をそのまま保持する。
  const mileageChanged = currentMileage !== existing.current_mileage;

  const { data, error } = await supabase
    .from("motorcycles")
    .update({
      name,
      manufacturer: manufacturer || null,
      model: model || null,
      current_mileage: currentMileage,
      ...(mileageChanged ? { mileage_recorded_on: getTodayDateString() } : {}),
      displacement_cc: displacementCc,
      bike_type: bikeType,
      icon_color: iconColor,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    console.error("[updateMotorcycle] update failed:", error.code, error.message);
    return { error: "更新に失敗しました。しばらくしてから再度お試しください。" };
  }

  if (!data || data.length === 0) {
    return { error: "対象のバイクが見つかりません。" };
  }

  redirect(`/motorcycles/${id}`);
}
