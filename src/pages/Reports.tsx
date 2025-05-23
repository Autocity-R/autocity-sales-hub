
import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
  Activity,
  FileText,
  PieChart
} from "lucide-react";
import { getReportsData, getAvailablePeriods, exportReportData } from "@/services/reportsService";
import { PerformanceData, ReportPeriod } from "@/types/reports";
import { useToast } from "@/hooks/use-toast";
import { ReportsCharts } from "@/components/reports/ReportsCharts";
import { TeamPerformanceTable } from "@/components/reports/TeamPerformanceTable";
import { VehicleTypesChart } from "@/components/reports/VehicleTypesChart";

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(getAvailablePeriods()[1]);
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
      {/* Reports Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <FileText className="h-8 w-8" />
              Business Rapportages & Analytics
            </h1>
            <p className="text-blue-100 text-lg">
              Gedetailleerde performance analyse voor {selectedPeriod.label.toLowerCase()}
            </p>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <Badge variant="secondary" className="bg-blue-500/20 text-white border-blue-400">
                <Calendar className="w-3 h-3 mr-1" />
                {selectedPeriod.label}
              </Badge>
              <Badge variant="secondary" className="bg-blue-500/20 text-white border-blue-400">
                <Activity className="w-3 h-3 mr-1" />
                Live Data
              </Badge>
            </div>
          </div>
          
          {/* Controls Section */}
          <div className="flex flex-col gap-3">
            <Select value={selectedPeriod.label} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-48 bg-white text-gray-900">
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
            
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleExport('excel')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="w-3 h-3 mr-1" />
                Excel
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleExport('csv')}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Download className="w-3 h-3 mr-1" />
                CSV
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleExport('pdf')}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Download className="w-3 h-3 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
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

      {/* Charts and Analytics Section */}
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

      {/* Detailed Analytics Section */}
      <div className="space-y-6">
        {/* Lead Performance Deep Dive */}
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

        {/* Team Performance Table */}
        <TeamPerformanceTable teamMembers={reportData.teamPerformance} />
      </div>
    </DashboardLayout>
  );
};

export default Reports;
