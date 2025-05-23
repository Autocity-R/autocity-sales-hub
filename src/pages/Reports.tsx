
import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Car, 
  Euro, 
  Download,
  Calendar,
  Clock,
  Target,
  Activity
} from "lucide-react";
import { getReportsData, getAvailablePeriods, exportReportData } from "@/services/reportsService";
import { PerformanceData, ReportPeriod } from "@/types/reports";
import { useToast } from "@/hooks/use-toast";
import { ReportsCharts } from "@/components/reports/ReportsCharts";
import { TeamPerformanceTable } from "@/components/reports/TeamPerformanceTable";
import { VehicleTypesChart } from "@/components/reports/VehicleTypesChart";

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(getAvailablePeriods()[1]); // Default to current month
  const [reportData, setReportData] = useState<PerformanceData>(getReportsData(getAvailablePeriods()[1]));
  const { toast } = useToast();

  const handlePeriodChange = (periodLabel: string) => {
    const period = getAvailablePeriods().find(p => p.label === periodLabel);
    if (period) {
      setSelectedPeriod(period);
      setReportData(getReportsData(period));
    }
  };

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    try {
      const fileName = await exportReportData(reportData, format);
      toast({
        title: "Export Gestart",
        description: `Rapport wordt geëxporteerd als ${format.toUpperCase()}: ${fileName}`,
      });
    } catch (error) {
      toast({
        title: "Export Fout",
        description: "Er ging iets mis bij het exporteren van het rapport",
        variant: "destructive",
      });
    }
  };

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
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rapportages</h1>
            <p className="text-muted-foreground">
              Performance analytics en data-inzichten voor {selectedPeriod.label.toLowerCase()}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Select value={selectedPeriod.label} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-48">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailablePeriods().map((period) => (
                  <SelectItem key={period.label} value={period.label}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => handleExport('excel')}>
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')}>
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Omzet</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reportData.sales.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Marge: {formatPercentage(reportData.sales.averageMargin)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verkochte Auto's</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.sales.totalUnits}</div>
              <p className="text-xs text-muted-foreground">
                Omloopsnelheid: {reportData.turnoverRate} dagen
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lead Conversie</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(reportData.leads.conversionRate)}</div>
              <p className="text-xs text-muted-foreground">
                {reportData.leads.totalLeads} leads totaal
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reactietijd</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.leads.responseTime}u</div>
              <p className="text-xs text-muted-foreground">
                Gemiddelde opvolging
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReportsCharts data={reportData} />
          <VehicleTypesChart vehicleTypes={reportData.vehicleTypes} />
        </div>

        {/* Lead Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Lead Performance Overzicht
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{reportData.leads.totalLeads}</div>
                <div className="text-sm text-muted-foreground">Totale Leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatPercentage(reportData.leads.followUpRate)}</div>
                <div className="text-sm text-muted-foreground">Opvolg Ratio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{reportData.leads.avgDaysToClose}</div>
                <div className="text-sm text-muted-foreground">Dagen tot Afsluiting</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{reportData.leads.responseTime}u</div>
                <div className="text-sm text-muted-foreground">Gemiddelde Reactietijd</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <TeamPerformanceTable teamMembers={reportData.teamPerformance} />
      </div>
    </DashboardLayout>
  );
};

export default Reports;
