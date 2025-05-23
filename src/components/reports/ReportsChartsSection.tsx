
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PieChart } from "lucide-react";
import { PerformanceData } from "@/types/reports";
import { ReportsCharts } from "@/components/reports/ReportsCharts";
import { VehicleTypesChart } from "@/components/reports/VehicleTypesChart";

interface ReportsChartsSectionProps {
  reportData: PerformanceData;
}

export const ReportsChartsSection: React.FC<ReportsChartsSectionProps> = ({ reportData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Verkoop Trends & Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReportsCharts data={reportData} />
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-green-600" />
            Voertuig Categorieën
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleTypesChart vehicleTypes={reportData.vehicleTypes} />
        </CardContent>
      </Card>
    </div>
  );
};
