
import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Download,
  Calendar,
  TrendingUp,
  Users,
  Target,
  Clock,
  Euro,
  Activity,
  Brain
} from "lucide-react";
import { PerformanceMetrics } from "@/components/reports/PerformanceMetrics";
import { SalesAnalytics } from "@/components/reports/SalesAnalytics";
import { LeadTrackingDashboard } from "@/components/reports/LeadTrackingDashboard";
import { AIInsightsPanel } from "@/components/reports/AIInsightsPanel";
import { getReportsData, getAvailablePeriods, exportReportData } from "@/services/reportsService";
import { ReportPeriod } from "@/types/reports";
import { useToast } from "@/hooks/use-toast";

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(getAvailablePeriods()[1]);
  const [reportData, setReportData] = useState(getReportsData(getAvailablePeriods()[1]));
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
        description: `Performance rapport wordt geëxporteerd als ${format.toUpperCase()}: ${fileName}`,
      });
    } catch (error) {
      toast({
        title: "Export Fout",
        description: "Er ging iets mis bij het exporteren van het rapport",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      {/* Header Section */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-8 rounded-xl mb-8 shadow-2xl">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="h-8 w-8 text-blue-300" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Sales Performance Analytics</h1>
                <p className="text-blue-200 text-lg mt-1">
                  Uitgebreide analyse van verkoop prestaties en lead conversie
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-200 border-blue-400">
                <Calendar className="w-3 h-3 mr-1" />
                {selectedPeriod.label}
              </Badge>
              <Badge variant="secondary" className="bg-green-500/20 text-green-200 border-green-400">
                <Activity className="w-3 h-3 mr-1" />
                Live Performance Data
              </Badge>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-200 border-purple-400">
                <Brain className="w-3 h-3 mr-1" />
                AI Insights Actief
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <Select value={selectedPeriod.label} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
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
                className="bg-green-600 hover:bg-green-700 text-white border-0"
              >
                <Download className="w-3 h-3 mr-1" />
                Excel
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleExport('pdf')}
                className="bg-red-600 hover:bg-red-700 text-white border-0"
              >
                <Download className="w-3 h-3 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <PerformanceMetrics reportData={reportData} />

      {/* Main Analytics Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        <div className="xl:col-span-2">
          <SalesAnalytics reportData={reportData} />
        </div>
        <div>
          <AIInsightsPanel reportData={reportData} />
        </div>
      </div>

      {/* Lead Tracking Dashboard */}
      <LeadTrackingDashboard reportData={reportData} />
    </DashboardLayout>
  );
};

export default Reports;
