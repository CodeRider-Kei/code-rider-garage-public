import type { SupabaseClient } from "@supabase/supabase-js";

export type ApplyMileageUpdateResult =
  | { ok: true }
  | { ok: false; error: string; needsConfirmation?: boolean };

/**
 * バイクの現在走行距離を直接更新する共通ロジック。
 * クイック更新のほか、将来的に給油記録など別の入力経路を追加する場合も
 * ここを共通の入口として使うことを想定している。
 *
 * 現在値より小さい値は force=true が指定されない限り拒否する
 * (誤入力・古い値での意図しない上書きを防ぐため)。
 * 所有権はここで確認する(呼び出し元のServer Actionでも別途確認する)。
 */
export async function applyMileageUpdate(
  supabase: SupabaseClient,
  params: {
    motorcycleId: string;
    userId: string;
    mileage: number;
    recordedOn: string;
    force: boolean;
  },
): Promise<ApplyMileageUpdateResult> {
  const { motorcycleId, userId, mileage, recordedOn, force } = params;

  const { data: motorcycle } = await supabase
    .from("motorcycles")
    .select("id, current_mileage")
    .eq("id", motorcycleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!motorcycle) {
    return { ok: false, error: "このバイクを更新する権限がありません。" };
  }

  if (mileage < motorcycle.current_mileage && !force) {
    return {
      ok: false,
      needsConfirmation: true,
      error: `入力した走行距離(${mileage.toLocaleString("ja-JP")}km)は現在の記録(${motorcycle.current_mileage.toLocaleString("ja-JP")}km)より小さい値です。誤りがなければ下のチェックを入れて再度お試しください。`,
    };
  }

  const { error } = await supabase
    .from("motorcycles")
    .update({ current_mileage: mileage, mileage_recorded_on: recordedOn })
    .eq("id", motorcycleId)
    .eq("user_id", userId);

  if (error) {
    console.error("[applyMileageUpdate] update failed:", error.code, error.message);
    return { ok: false, error: "更新に失敗しました。しばらくしてから再度お試しください。" };
  }

  return { ok: true };
}
