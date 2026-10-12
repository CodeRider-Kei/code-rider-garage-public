"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { MonthlyMileagePoint } from "@/lib/mileage-analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

const chartConfig: ChartConfig = {
  distance: { label: "走行距離", color: "hsl(var(--chart-2))" },
};

function km(value: number) {
  return `${value.toLocaleString("ja-JP")} km`;
}

function DistanceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: MonthlyMileagePoint }[];
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-foreground">{point.fullLabel}</p>
      <p className="text-muted-foreground">{km(point.distance)}</p>
    </div>
  );
}

export function MileageHistoryChart({
  hasData,
  monthlyData,
}: {
  hasData: boolean;
  monthlyData: MonthlyMileagePoint[];
}) {
  const periodTotal = useMemo(
    () => monthlyData.reduce((sum, m) => sum + m.distance, 0),
    [monthlyData],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">月別走行距離</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            走行距離を入力した記録が2件以上になると、月ごとの走行距離の目安がここに表示されます。
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              直近12か月の合計:{" "}
              <span className="font-medium text-foreground">
                {km(periodTotal)}
              </span>
            </p>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-56 w-full"
            >
              <BarChart data={monthlyData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  fontSize={10}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  fontSize={10}
                  tickFormatter={(value: number) => value.toLocaleString("ja-JP")}
                />
                <ChartTooltip content={<DistanceTooltip />} />
                <Bar dataKey="distance" fill="var(--color-distance)" radius={4} />
              </BarChart>
            </ChartContainer>
            <p className="sr-only">
              月別走行距離(目安): {" "}
              {monthlyData
                .map((m) => `${m.fullLabel} ${km(m.distance)}`)
                .join("、")}
              。直近12か月の合計は{km(periodTotal)}です。
            </p>
            <p className="text-xs text-muted-foreground">
              整備記録に入力された走行距離と現在の走行距離をもとにした目安です(正確な走行ログではありません)。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
