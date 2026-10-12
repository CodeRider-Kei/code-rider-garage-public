"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

export type CostBreakdownSlice = {
  label: string;
  value: number;
  color: string;
};

/**
 * ダッシュボードのバイクカード用、小さな費用内訳ドーナツグラフ。
 * ツールチップ・凡例は持たない(カード内の別テキストで内訳%を表示する前提の
 * 純粋に視覚的な要素)。0件のスライスはRechartsに渡さない。
 */
export function CostBreakdownDonut({
  slices,
  size = 64,
}: {
  slices: CostBreakdownSlice[];
  size?: number;
}) {
  const data = slices.filter((s) => s.value > 0);

  const chartConfig: ChartConfig = useMemo(
    () => Object.fromEntries(data.map((s) => [s.label, { label: s.label }])),
    [data],
  );

  if (data.length === 0) {
    return null;
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-square shrink-0"
      style={{ width: size, height: size }}
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={size * 0.3}
          outerRadius={size * 0.5}
          strokeWidth={1}
        >
          {data.map((slice) => (
            <Cell key={slice.label} fill={slice.color} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
