"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";

interface ReservationTrendsChartProps {
  data: { date: string; bookings: number }[];
}

const chartConfig = {
  bookings: {
    label: "Bookings",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ReservationTrendsChart({ data }: ReservationTrendsChartProps) {
  return (
    <div style={{ height: 250, width: "100%" }}>
      <ChartContainer config={chartConfig} className="h-full w-full">
        <BarChart accessibilityLayer data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={5}
            axisLine={false}
            tickFormatter={(value) => {
              const dateObj = new Date(value);
              return isNaN(dateObj.getTime()) ? value : dateObj.toLocaleDateString(undefined, { weekday: "short" });
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            allowDecimals={false}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
