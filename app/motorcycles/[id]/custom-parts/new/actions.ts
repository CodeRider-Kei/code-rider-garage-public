"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  CUSTOM_PART_BRAND_MAX_LENGTH,
  CUSTOM_PART_CATEGORIES,
  CUSTOM_PART_NAME_MAX_LENGTH,
  CUSTOM_PART_NOTE_MAX_LENGTH,
  CUSTOM_PART_SHOP_NAME_MAX_LENGTH,
  type CustomPartFormState,
} from "@/lib/custom-part";
import { checkMileageAgainstCurrent } from "@/lib/mileage-confirmation";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function createCustomPart(
  motorcycleId: string,
  _prevState: CustomPartFormState,
  formData: FormData,
): Promise<CustomPartFormState> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getClaims();
  const user = userData?.claims;

  if (userError || !user) {
    redirect("/auth/login");
  }

  const userId = user.sub as string;

  // Server Action側でも所有権を明示的に確認する(RLSだけに頼らない)
  const { data: motorcycle } = await supabase
    .from("motorcycles")
    .select("id, current_mileage")
    .eq("id", motorcycleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!motorcycle) {
    return { error: "このバイクへのカスタムパーツ登録権限がありません。" };
  }

  const partName = String(formData.get("part_name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const shopName = String(formData.get("shop_name") ?? "").trim();
  const purchaseDate = String(formData.get("purchase_date") ?? "").trim();
  const mileageRaw = String(formData.get("mileage") ?? "").trim();
  const costRaw = String(formData.get("cost") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const force = formData.get("force") === "on";

  if (!partName) {
    return { error: "パーツ名を入力してください。" };
  }
  if (partName.length > CUSTOM_PART_NAME_MAX_LENGTH) {
    return { error: `パーツ名は${CUSTOM_PART_NAME_MAX_LENGTH}文字以内で入力してください。` };
  }

  if (!category || !CUSTOM_PART_CATEGORIES.includes(category as (typeof CUSTOM_PART_CATEGORIES)[number])) {
    return { error: "カテゴリーを選択してください。" };
  }
  if (brand.length > CUSTOM_PART_BRAND_MAX_LENGTH) {
    return { error: `ブランドは${CUSTOM_PART_BRAND_MAX_LENGTH}文字以内で入力してください。` };
  }
  if (shopName.length > CUSTOM_PART_SHOP_NAME_MAX_LENGTH) {
    return { error: `購入・施工店舗は${CUSTOM_PART_SHOP_NAME_MAX_LENGTH}文字以内で入力してください。` };
  }

  if (!purchaseDate || !DATE_PATTERN.test(purchaseDate)) {
    return { error: "購入・取付日を入力してください。" };
  }

  let mileage: number | null = null;
  if (mileageRaw !== "") {
    mileage = Number(mileageRaw);
    if (!Number.isInteger(mileage) || mileage < 0) {
      return { error: "取付時走行距離は0以上の整数で入力してください。" };
    }
  }

  const mileageConfirmation = checkMileageAgainstCurrent(
    mileage,
    motorcycle.current_mileage,
    force,
  );
  if (mileageConfirmation) {
    return mileageConfirmation;
  }

  let cost: number | null = null;
  if (costRaw !== "") {
    cost = Number(costRaw);
    if (!Number.isInteger(cost) || cost < 0) {
      return { error: "費用は0以上の整数で入力してください。" };
    }
  }

  if (note.length > CUSTOM_PART_NOTE_MAX_LENGTH) {
    return { error: `メモは${CUSTOM_PART_NOTE_MAX_LENGTH}文字以内で入力してください。` };
  }

  const { error } = await supabase.from("custom_parts").insert({
    user_id: userId,
    motorcycle_id: motorcycleId,
    part_name: partName,
    category,
    brand: brand || null,
    shop_name: shopName || null,
    purchase_date: purchaseDate,
    mileage,
    cost,
    note: note || null,
  });

  if (error) {
    console.error("[createCustomPart] insert failed:", error.code, error.message);
    return { error: "登録に失敗しました。しばらくしてから再度お試しください。" };
  }

  redirect(`/motorcycles/${motorcycleId}`);
}
