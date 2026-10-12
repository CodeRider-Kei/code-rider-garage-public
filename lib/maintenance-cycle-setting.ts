export type MaintenanceCycleSetting = {
  id: string;
  item_name: string;
  category: string;
  distance_interval_km: number | null;
  period_interval_months: number | null;
};

export type MaintenanceCycleSettingFormState = {
  error?: string;
};

// フロント(maxLength)・Server Action・DB制約(CHECK)で共通して使う上限値。
export const MAINTENANCE_CYCLE_SETTING_ITEM_NAME_MAX_LENGTH = 50;
