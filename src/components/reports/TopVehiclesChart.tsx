
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TopVehiclesChartProps {
  data: Array<{
    model: string;
    brand: string;
    sales: number;
    revenue: number;
  }>;
}

export const TopVehiclesChart: React.FC<TopVehiclesChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="model" type="category" width={100} />
        <Tooltip formatter={(value: number, name: string) => 
          name === 'sales' ? [`${value} stuks`, 'Verkoop'] : [`€${value.toLocaleString()}`, 'Omzet']
        } />
        <Bar dataKey="sales" fill="#8884d8" name="Verkoop" />
      </BarChart>
    </ResponsiveContainer>
  );
};
