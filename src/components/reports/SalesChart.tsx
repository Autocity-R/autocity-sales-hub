
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SalesChartProps {
  data: Array<{
    category: string;
    b2c: number;
    b2b: number;
  }>;
}

export const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="category" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="b2c" fill="#8884d8" name="B2C Verkoop" />
        <Bar dataKey="b2b" fill="#82ca9d" name="B2B Verkoop" />
      </BarChart>
    </ResponsiveContainer>
  );
};
