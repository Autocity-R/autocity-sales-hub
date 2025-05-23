
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { VehicleTypeMetrics } from "@/types/reports";
import { Car } from "lucide-react";

interface VehicleTypesChartProps {
  vehicleTypes: VehicleTypeMetrics[];
}

export const VehicleTypesChart: React.FC<VehicleTypesChartProps> = ({ vehicleTypes }) => {
  const chartConfig = {
    unitsSold: {
      label: "Verkochte Eenheden",
      color: "hsl(var(--chart-3))",
    },
    revenue: {
      label: "Omzet",
      color: "hsl(var(--chart-4))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Verkopen per Merk
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vehicleTypes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="unitsSold" 
                fill="var(--color-unitsSold)" 
                name="Verkochte Eenheden"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
