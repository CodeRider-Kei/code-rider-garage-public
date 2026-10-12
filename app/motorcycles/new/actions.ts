"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  BIKE_TYPES,
  FREE_MOTORCYCLE_LIMIT,
  ICON_COLORS,
  MOTORCYCLE_MANUFACTURER_MAX_LENGTH,
  MOTORCYCLE_MODEL_MAX_LENGTH,
  MOTORCYCLE_NAME_MAX_LENGTH,
  type BikeType,
  type IconColor,
  type MotorcycleFormState,
} from "@/lib/motorcycle";

export async function createMotorcycle(
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

  // 登録ページ側でも事前にチェックしているが、Server Action側でも二重に強制する
  // (フォーム表示後に別タブから登録する等の抜け道を防ぐ)。
  const { count } = await supabase
    .from("motorcycles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) >= FREE_MOTORCYCLE_LIMIT) {
    return {
      error: `現在登録できるバイクは${FREE_MOTORCYCLE_LIMIT}台までです。`,
    };
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

  const { error } = await supabase.from("motorcycles").insert({
    user_id: userId,
    name,
    manufacturer: manufacturer || null,
    model: model || null,
    current_mileage: currentMileage,
    displacement_cc: displacementCc,
    bike_type: bikeType,
    icon_color: iconColor,
  });

  if (error) {
    console.error("[createMotorcycle] insert failed:", error.code, error.message);
    return { error: "登録に失敗しました。しばらくしてから再度お試しください。" };
  }

  redirect("/dashboard");
}
