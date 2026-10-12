import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** 一覧ページのカード1枚分(見出し+本文数行+任意でバッジ/操作ボタン)。 */
function ListCardSkeleton({
  badge = false,
  lines = 3,
  actions = false,
}: {
  badge?: boolean;
  lines?: number;
  actions?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          {badge && <Skeleton className="h-5 w-16 shrink-0 rounded-md" />}
        </div>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full max-w-[80%]" />
        ))}
        {actions && (
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-16" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** カードグリッド一覧(整備予定/カスタム/保険/給油/ローン等、各ページ共通のgrid)。 */
export function CardGridSkeleton({
  count = 3,
  badge = false,
  lines = 3,
  actions = false,
}: {
  count?: number;
  badge?: boolean;
  lines?: number;
  actions?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ListCardSkeleton key={i} badge={badge} lines={lines} actions={actions} />
      ))}
    </div>
  );
}

/** 見出し+「＋追加」ボタン+カードグリッドの一覧ページ全体。 */
export function ListPageSkeleton({
  count = 3,
  badge = false,
  lines = 3,
  actions = false,
}: {
  count?: number;
  badge?: boolean;
  lines?: number;
  actions?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-40" />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
        <CardGridSkeleton count={count} badge={badge} lines={lines} actions={actions} />
      </div>
    </div>
  );
}

/** new/editフォームページ(1カード、ラベル+入力欄の並び)。 */
export function FormCardSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-28" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

/** 単一レコード詳細ページ(整備記録詳細など)。 */
export function DetailCardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full max-w-[70%]" />
          ))}
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}

/** 月グリッドカレンダー。 */
export function CalendarSkeleton() {
  return (
    <Card className="w-full max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** ダッシュボードのバイクカード1枚分。 */
function MotorcycleCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

/** ダッシュボード全体。 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <MotorcycleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** バイク概要ページの2x3メニュー。 */
function MenuGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-2 pt-6">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** バイク概要ページ全体(情報カード+編集/削除+メニュー)。 */
export function MotorcycleDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-40" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <MenuGridSkeleton />
    </div>
  );
}

/** 整備ページ全体(サイクル設定+カレンダー+予定+記録一覧)。 */
export function MaintenancePageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-48" />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
        <CardGridSkeleton count={3} lines={2} actions />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <CalendarSkeleton />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-32" />
        <CardGridSkeleton count={2} lines={3} badge actions />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
        <CardGridSkeleton count={3} lines={3} />
      </div>
    </div>
  );
}

/** 費用分析ページ全体(タブ+チャート2枚)。 */
export function AnalysisPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-24" />
      <div className="grid w-full gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-6 gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** アカウント設定ページ全体(複数カード)。 */
export function AccountPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
