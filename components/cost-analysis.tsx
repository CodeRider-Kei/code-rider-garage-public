"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import type { CategoryCostPoint, MonthlyCostPoint } from "@/lib/cost-analysis";
import { formatYen as yen } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function MonthlyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: MonthlyCostPoint }[];
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-foreground">{point.fullLabel}</p>
      <p className="text-muted-foreground">{yen(point.cost)}</p>
    </div>
  );
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CategoryCostPoint }[];
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-foreground">{point.category}</p>
      <p className="text-muted-foreground">
        {yen(point.cost)} ({point.percent.toFixed(0)}%)
      </p>
    </div>
  );
}

/**
 * 費用の分析表示。月別の棒グラフ+カテゴリー別の円グラフを持つ汎用コンポーネントで、
 * 整備費用・カスタム費用・保険料・整備/カスタム/保険のソース別内訳など、
 * 「カテゴリー名+費用」の集計結果であればどのソースにも使い回す。
 * monthlyDataを渡さない場合はカテゴリー別の円グラフのみを単独表示する
 * (保険料のように「月別」という切り口が馴染まないソース向け)。
 */
export function CostAnalysis({
  title,
  costLabel = "費用",
  emptyMessage = "費用を入力すると、ここに分析が表示されます。",
  hasData,
  monthlyData,
  categoryData,
}: {
  title: string;
  costLabel?: string;
  emptyMessage?: string;
  hasData: boolean;
  monthlyData?: MonthlyCostPoint[];
  categoryData: CategoryCostPoint[];
}) {
  const barChartConfig: ChartConfig = useMemo(
    () => ({ cost: { label: costLabel, color: "hsl(var(--chart-1))" } }),
    [costLabel],
  );
  const periodTotal = useMemo(
    () => (monthlyData ?? []).reduce((sum, m) => sum + m.cost, 0),
    [monthlyData],
  );
  const categoryTotal = useMemo(
    () => categoryData.reduce((sum, c) => sum + c.cost, 0),
    [categoryData],
  );

  // ChartLegendContent/ツールチップがカテゴリー名でラベルを解決できるよう、
  // カテゴリーごとのラベルを持つ設定を実データから動的に組み立てる。
  const pieChartConfig: ChartConfig = useMemo(
    () =>
      Object.fromEntries(
        categoryData.map((c) => [c.category, { label: c.category }]),
      ),
    [categoryData],
  );

  const categoryChart =
    categoryTotal === 0 ? (
      <p className="text-center text-sm text-muted-foreground py-6">
        費用が入力された記録がありません。
      </p>
    ) : (
      <>
        <ChartContainer
          config={pieChartConfig}
          className="aspect-square max-h-64 w-full mx-auto"
        >
          <PieChart>
            <ChartTooltip content={<CategoryTooltip />} />
            <Pie
              data={categoryData}
              dataKey="cost"
              nameKey="category"
              innerRadius={50}
              outerRadius={90}
              strokeWidth={2}
            >
              {categoryData.map((entry, index) => (
                <Cell
                  key={entry.category}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="category" />} />
          </PieChart>
        </ChartContainer>
        <p className="sr-only">
          カテゴリー別内訳: {" "}
          {categoryData
            .map((c) => `${c.category} ${yen(c.cost)}(${c.percent.toFixed(0)}%)`)
            .join("、")}
          。合計 {yen(categoryTotal)}。
        </p>
      </>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            {emptyMessage}
          </p>
        ) : monthlyData ? (
          <Tabs defaultValue="monthly">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">月別費用</TabsTrigger>
              <TabsTrigger value="category">カテゴリー別</TabsTrigger>
            </TabsList>

            <TabsContent value="monthly" className="flex flex-col gap-3 pt-4">
              <p className="text-sm text-muted-foreground">
                直近12か月の合計:{" "}
                <span className="font-medium text-foreground">
                  {yen(periodTotal)}
                </span>
              </p>
              <ChartContainer
                config={barChartConfig}
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
                  <ChartTooltip content={<MonthlyTooltip />} />
                  <Bar dataKey="cost" fill="var(--color-cost)" radius={4} />
                </BarChart>
              </ChartContainer>
              <p className="sr-only">
                月別{costLabel}: {" "}
                {monthlyData
                  .map((m) => `${m.fullLabel} ${yen(m.cost)}`)
                  .join("、")}
                。直近12か月の合計は{yen(periodTotal)}です。
              </p>
            </TabsContent>

            <TabsContent value="category" className="flex flex-col gap-3 pt-4">
              {categoryChart}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              合計:{" "}
              <span className="font-medium text-foreground">
                {yen(categoryTotal)}
              </span>
            </p>
            {categoryChart}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
