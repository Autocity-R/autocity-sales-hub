
import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getReportsData, getAvailablePeriods, exportReportData } from "@/services/reportsService";
import { PerformanceData, ReportPeriod } from "@/types/reports";
import { useToast } from "@/hooks/use-toast";
import { ReportsHeader } from "@/components/reports/ReportsHeader";
import { ReportsKPICards } from "@/components/reports/ReportsKPICards";
import { ReportsChartsSection } from "@/components/reports/ReportsChartsSection";
import { ReportsLeadAnalysis } from "@/components/reports/ReportsLeadAnalysis";
import { TeamPerformanceTable } from "@/components/reports/TeamPerformanceTable";

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

  return (
    <DashboardLayout>
      <ReportsHeader
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
        onExport={handleExport}
      />

      <ReportsKPICards reportData={reportData} />

      <ReportsChartsSection reportData={reportData} />

      <div className="space-y-6">
        <ReportsLeadAnalysis reportData={reportData} />
        <TeamPerformanceTable teamMembers={reportData.teamPerformance} />
      </div>
    </DashboardLayout>
  );
};

export default Reports;
