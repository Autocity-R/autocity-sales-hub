
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts";
import { PerformanceData } from "@/types/reports";
import { TrendingUp } from "lucide-react";

interface ReportsChartsProps {
  data: PerformanceData;
}

export const ReportsCharts: React.FC<ReportsChartsProps> = ({ data }) => {
  // Mock monthly data for trend chart
  const monthlyData = [
    { month: "Jan", sales: 45, revenue: 1800000 },
    { month: "Feb", sales: 52, revenue: 2100000 },
    { month: "Mar", sales: 48, revenue: 1950000 },
    { month: "Apr", sales: 61, revenue: 2400000 },
    { month: "Mei", sales: 55, revenue: 2200000 },
    { month: "Jun", sales: 67, revenue: 2650000 },
  ];

  const chartConfig = {
    sales: {
      label: "Verkopen",
      color: "hsl(var(--chart-1))",
    },
    revenue: {
      label: "Omzet",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Verkoop Trend (6 maanden)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="sales" 
                stroke="var(--color-sales)" 
                strokeWidth={2}
                name="Verkopen"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
