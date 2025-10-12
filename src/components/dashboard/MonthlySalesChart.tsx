import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useMonthlySalesData } from "@/hooks/useMonthlySalesData";
import { Skeleton } from "@/components/ui/skeleton";

const MonthlySalesChart = () => {
  const { data: monthlyData, isLoading } = useMonthlySalesData();

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Verkopen per Maand</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Verkopen per Maand (B2B vs B2C)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="b2b" fill="hsl(var(--primary))" name="B2B" />
            <Bar dataKey="b2c" fill="hsl(var(--accent))" name="B2C" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default MonthlySalesChart;
