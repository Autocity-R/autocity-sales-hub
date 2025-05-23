
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  Car, 
  Target,
  Clock
} from "lucide-react";
import { PerformanceData } from "@/types/reports";

interface ReportsKPICardsProps {
  reportData: PerformanceData;
}

export const ReportsKPICards: React.FC<ReportsKPICardsProps> = ({ reportData }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Totale Omzet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(reportData.sales.totalRevenue)}</div>
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <TrendingUp className="w-3 h-3 mr-1" />
            Marge: {formatPercentage(reportData.sales.averageMargin)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Verkochte Voertuigen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-700">{reportData.sales.totalUnits}</div>
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <Car className="w-3 h-3 mr-1" />
            Omloop: {reportData.turnoverRate} dagen
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Lead Conversie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-700">{formatPercentage(reportData.leads.conversionRate)}</div>
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <Target className="w-3 h-3 mr-1" />
            {reportData.leads.totalLeads} leads
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Reactietijd</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-700">{reportData.leads.responseTime}u</div>
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <Clock className="w-3 h-3 mr-1" />
            Gemiddeld
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Opvolg Ratio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-indigo-700">{formatPercentage(reportData.leads.followUpRate)}</div>
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <Users className="w-3 h-3 mr-1" />
            Team gemiddelde
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
