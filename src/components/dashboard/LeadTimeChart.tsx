
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Example data - in a real app, this would come from API/backend
const data = [
  { week: "Week 1", doorlooptijd: 6 },
  { week: "Week 2", doorlooptijd: 5.5 },
  { week: "Week 3", doorlooptijd: 6.2 },
  { week: "Week 4", doorlooptijd: 5 },
  { week: "Week 5", doorlooptijd: 4.8 },
  { week: "Week 6", doorlooptijd: 4.2 },
];

const LeadTimeChart = () => {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Lead Doorlooptijd</CardTitle>
        <CardDescription>
          Gemiddeld aantal dagen tussen lead aanmaak en conversie per week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
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
                dataKey="week" 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                width={40} 
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="doorlooptijd"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadTimeChart;
