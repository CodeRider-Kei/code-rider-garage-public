"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { MAINTENANCE_CATEGORIES } from "@/lib/maintenance-record";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export function MaintenanceRecordFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="grid grid-cols-2 gap-2 max-w-md">
      <div className="grid gap-1">
        <Label htmlFor="filter-category" className="text-xs text-muted-foreground">
          カテゴリー
        </Label>
        <NativeSelect
          id="filter-category"
          value={category}
          onChange={(e) => updateParam("category", e.target.value)}
        >
          <option value="">すべて</option>
          {MAINTENANCE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="filter-sort" className="text-xs text-muted-foreground">
          並び順
        </Label>
        <NativeSelect
          id="filter-sort"
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value)}
        >
          <option value="desc">整備日が新しい順</option>
          <option value="asc">整備日が古い順</option>
        </NativeSelect>
      </div>
    </div>
  );
}
