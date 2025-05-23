
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { PerformanceData } from "@/types/reports";
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";

interface SalesAnalyticsProps {
  reportData: PerformanceData;
}

export const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ reportData }) => {
  // Mock data voor sales trends
  const salesTrends = [
    { maand: "Jan", verkopen: 42, omzet: 1680000 },
    { maand: "Feb", verkopen: 38, omzet: 1520000 },
    { maand: "Mar", verkopen: 45, omzet: 1800000 },
    { maand: "Apr", verkopen: 52, omzet: 2080000 },
    { maand: "Mei", verkopen: 48, omzet: 1920000 },
    { maand: "Jun", verkopen: 55, omzet: 2200000 },
  ];

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  const chartConfig = {
    verkopen: {
      label: "Verkopen",
      color: "hsl(var(--chart-1))",
    },
    omzet: {
      label: "Omzet",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Sales Trend Chart */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Verkoop Trends (6 Maanden)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="maand" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="verkopen" 
                  stroke="var(--color-verkopen)" 
                  strokeWidth={3}
                  name="Verkopen"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Vehicle Types Distribution */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-green-600" />
            Verkoop Verdeling per Merk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportData.vehicleTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, percentage }) => `${type}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="unitsSold"
                  >
                    {reportData.vehicleTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-4">
              {reportData.vehicleTypes.map((vehicle, index) => (
                <div key={vehicle.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <div className="font-medium">{vehicle.type}</div>
                      <div className="text-sm text-gray-500">{vehicle.unitsSold} voertuigen</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {new Intl.NumberFormat('nl-NL', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(vehicle.revenue)}
                    </div>
                    <div className="text-sm text-gray-500">{vehicle.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
