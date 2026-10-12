"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { FuelEconomyPoint } from "@/lib/fuel-economy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

const chartConfig: ChartConfig = {
  kmPerLiter: { label: "燃費", color: "hsl(var(--chart-4))" },
};

function kmPerLiterLabel(value: number) {
  return `${value.toFixed(1)} km/L`;
}

function FuelEconomyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: FuelEconomyPoint }[];
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-foreground">{point.filled_on}</p>
      <p className="text-muted-foreground">{kmPerLiterLabel(point.kmPerLiter)}</p>
    </div>
  );
}

export function FuelEconomyChart({ points }: { points: FuelEconomyPoint[] }) {
  const average = useMemo(
    () =>
      points.length > 0
        ? points.reduce((sum, p) => sum + p.kmPerLiter, 0) / points.length
        : 0,
    [points],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">燃費(km/L)</CardTitle>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            満タン給油を走行距離つきで2回以上記録すると、ここに燃費の推移が表示されます。
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              平均:{" "}
              <span className="font-medium text-foreground">
                {kmPerLiterLabel(average)}
              </span>
            </p>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-56 w-full"
            >
              <BarChart data={points} margin={{ left: 0, right: 8 }}>
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
                <ChartTooltip content={<FuelEconomyTooltip />} />
                <Bar dataKey="kmPerLiter" fill="var(--color-kmPerLiter)" radius={4} />
              </BarChart>
            </ChartContainer>
            <p className="sr-only">
              燃費の推移: {" "}
              {points
                .map((p) => `${p.filled_on} ${kmPerLiterLabel(p.kmPerLiter)}`)
                .join("、")}
              。平均は{kmPerLiterLabel(average)}です。
            </p>
            <p className="text-xs text-muted-foreground">
              満タン給油同士の間隔から算出した目安です(部分給油や走行距離未入力の記録は含まれません)。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
