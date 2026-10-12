"use client";

import { useMemo, useState } from "react";

import { WEEKDAY_LABELS_JA, getMonthGrid, shiftMonth } from "@/lib/calendar";
import {
  DUE_STATUS_LABEL,
  getDueStatus,
  type DueStatus,
  type MaintenanceSchedule,
} from "@/lib/maintenance-schedule";
import { formatMaintenanceDate } from "@/lib/maintenance-record";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { MaintenanceScheduleCard } from "@/components/maintenance-schedule-card";

const DOT_CLASS: Record<DueStatus, string> = {
  overdue: "bg-red-600",
  due_soon: "bg-amber-500",
  ok: "bg-emerald-600",
};

export function MaintenanceCalendar({
  schedules,
  todayDateStr,
  currentMileage,
  mileageRecordedOn,
  initialYear,
  initialMonth,
}: {
  schedules: MaintenanceSchedule[];
  todayDateStr: string;
  currentMileage: number;
  mileageRecordedOn: string;
  initialYear: number;
  initialMonth: number;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  // 予定データはページ読み込み時にサーバーから取得した分をそのまま使い回す。
  // 月の切り替え・日付選択はここでのクライアント側の再計算のみで完結させ、
  // Supabaseへの再フェッチ(=ページ全体の再取得)を発生させない
  // (以前はURLのyear/month/dateを変えるたびにページ全体が5つのクエリを
  // 再実行しており、月切り替えのたびに体感できる遅延があった)。
  const dateSchedules = useMemo(
    () => schedules.filter((s) => s.next_due_date !== null),
    [schedules],
  );

  const statusesByDate = useMemo(() => {
    const map = new Map<string, DueStatus[]>();
    for (const schedule of dateSchedules) {
      if (!schedule.next_due_date) continue;
      const status = getDueStatus(schedule.next_due_date, todayDateStr);
      const list = map.get(schedule.next_due_date) ?? [];
      list.push(status);
      map.set(schedule.next_due_date, list);
    }
    return map;
  }, [dateSchedules, todayDateStr]);

  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const visibleDateSchedules = useMemo(
    () =>
      selectedDate
        ? dateSchedules.filter((s) => s.next_due_date === selectedDate)
        : dateSchedules.filter((s) => s.next_due_date?.startsWith(monthPrefix)),
    [dateSchedules, selectedDate, monthPrefix],
  );

  const cells = useMemo(
    () => getMonthGrid(year, month, todayDateStr),
    [year, month, todayDateStr],
  );

  function changeMonth(delta: number) {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
    setSelectedDate(undefined);
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2 lg:gap-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="text-sm underline underline-offset-4 lg:text-base"
              >
                ← 前月
              </button>
              <p className="text-sm font-medium lg:text-lg">
                {year}年{month}月
              </p>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="text-sm underline underline-offset-4 lg:text-base"
              >
                翌月 →
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground lg:text-sm">
              {WEEKDAY_LABELS_JA.map((weekday) => (
                <div key={weekday}>{weekday}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 lg:gap-2">
              {cells.map((cell) => {
                const statuses = statusesByDate.get(cell.date) ?? [];
                const worst: DueStatus | null = statuses.includes("overdue")
                  ? "overdue"
                  : statuses.includes("due_soon")
                    ? "due_soon"
                    : statuses.length > 0
                      ? "ok"
                      : null;
                const isSelected = selectedDate === cell.date;
                const statusLabel = worst ? DUE_STATUS_LABEL[worst] : null;

                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setSelectedDate(cell.date)}
                    aria-label={statusLabel ? `${cell.day}日 ${statusLabel}` : `${cell.day}日`}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md py-1.5 text-xs transition-colors hover:bg-accent lg:gap-1.5 lg:py-3 lg:text-base",
                      cell.isCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
                      cell.isToday && "font-bold",
                      isSelected && "bg-accent ring-1 ring-ring",
                    )}
                  >
                    <span aria-hidden="true">{cell.day}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-1.5 w-1.5 rounded-full lg:h-2 lg:w-2",
                        worst ? DOT_CLASS[worst] : "bg-transparent",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold">
          {selectedDate
            ? `${formatMaintenanceDate(selectedDate)}の予定`
            : `${year}年${month}月の整備予定`}
        </h3>
        {visibleDateSchedules.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              {selectedDate ? "この日の予定はありません。" : "この月の予定はありません。"}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDateSchedules.map((schedule) => (
              <MaintenanceScheduleCard
                key={schedule.id}
                schedule={schedule}
                currentMileage={currentMileage}
                mileageRecordedOn={mileageRecordedOn}
                todayDateStr={todayDateStr}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
