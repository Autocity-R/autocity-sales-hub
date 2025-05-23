
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { PerformanceData } from "@/types/reports";

interface ReportsLeadAnalysisProps {
  reportData: PerformanceData;
}

export const ReportsLeadAnalysis: React.FC<ReportsLeadAnalysisProps> = ({ reportData }) => {
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-600" />
          Lead Performance Analyse
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{reportData.leads.totalLeads}</div>
            <div className="text-sm text-gray-600 mt-1">Totale Leads</div>
            <div className="text-xs text-blue-500 mt-1">Inkomende aanvragen</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{formatPercentage(reportData.leads.followUpRate)}</div>
            <div className="text-sm text-gray-600 mt-1">Opvolg Ratio</div>
            <div className="text-xs text-green-500 mt-1">Contact gemaakt</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">{reportData.leads.avgDaysToClose}</div>
            <div className="text-sm text-gray-600 mt-1">Dagen tot Deal</div>
            <div className="text-xs text-orange-500 mt-1">Gemiddelde cyclus</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{reportData.leads.responseTime}u</div>
            <div className="text-sm text-gray-600 mt-1">Reactietijd</div>
            <div className="text-xs text-purple-500 mt-1">Eerste contact</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
