
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Example data - in a real app, this would come from API/backend
const data = [
  { month: "Jan", binnen: 20, onderweg: 10, verkocht: 15 },
  { month: "Feb", binnen: 25, onderweg: 12, verkocht: 20 },
  { month: "Mar", binnen: 30, onderweg: 15, verkocht: 22 },
  { month: "Apr", binnen: 28, onderweg: 13, verkocht: 25 },
  { month: "Mei", binnen: 32, onderweg: 14, verkocht: 30 },
  { month: "Jun", binnen: 35, onderweg: 16, verkocht: 32 },
];

const InventoryChart = () => {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Voorraadoverzicht</CardTitle>
        <CardDescription>
          Maandelijks overzicht van voertuigen binnen, onderweg en verkocht
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                width={40} 
              />
              <Tooltip />
              <Bar dataKey="binnen" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="onderweg" stackId="a" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="verkocht" stackId="a" fill="#5A6881" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryChart;
