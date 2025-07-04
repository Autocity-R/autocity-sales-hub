
import { PerformanceData, ReportPeriod, TeamMember, VehicleTypeMetrics, FinancialMetrics } from "@/types/reports";

// Mock data for reports
const mockTeamPerformance: TeamMember[] = [
  {
    id: "tm1",
    name: "Pieter Jansen",
    leadsAssigned: 25,
    leadsConverted: 18,
    revenue: 450000,
    responseTime: 2.5
  },
  {
    id: "tm2",
    name: "Sander Vermeulen",
    leadsAssigned: 22,
    leadsConverted: 14,
    revenue: 380000,
    responseTime: 4.2
  },
  {
    id: "tm3",
    name: "Lisa van der Berg",
    leadsAssigned: 28,
    leadsConverted: 21,
    revenue: 520000,
    responseTime: 1.8
  }
];

const mockVehicleTypes: VehicleTypeMetrics[] = [
  { type: "BMW", unitsSold: 45, revenue: 1800000, margin: 15.2, percentage: 28.5 },
  { type: "Mercedes", unitsSold: 38, revenue: 1950000, margin: 18.7, percentage: 24.1 },
  { type: "Audi", unitsSold: 42, revenue: 1680000, margin: 14.8, percentage: 26.6 },
  { type: "Volkswagen", unitsSold: 33, revenue: 990000, margin: 12.3, percentage: 20.9 }
];

const getFinancialMetrics = (baseMultiplier: number): FinancialMetrics => {
  const totalRevenue = Math.round(6420000 * baseMultiplier);
  const totalCosts = Math.round(4850000 * baseMultiplier);
  const grossProfit = totalRevenue - totalCosts;
  const operatingExpenses = Math.round(850000 * baseMultiplier);
  const netProfit = grossProfit - operatingExpenses;
  
  return {
    totalRevenue,
    totalCosts,
    grossProfit,
    netProfit,
    grossMargin: (grossProfit / totalRevenue) * 100,
    netMargin: (netProfit / totalRevenue) * 100,
    operatingExpenses,
    ebitda: grossProfit - operatingExpenses + Math.round(120000 * baseMultiplier), // Add back depreciation
    cashFlow: netProfit + Math.round(180000 * baseMultiplier), // Add non-cash expenses
    profitGrowth: baseMultiplier > 1 ? 12.5 : baseMultiplier < 1 ? -8.2 : 15.8
  };
};

export const getReportsData = (period: ReportPeriod): PerformanceData => {
  // Simulate different data based on period
  const baseMultiplier = period.type === 'year' ? 12 : period.type === 'month' ? 1 : 0.25;
  
  return {
    period,
    sales: {
      totalSales: Math.round(158 * baseMultiplier),
      totalRevenue: Math.round(6420000 * baseMultiplier),
      averageMargin: 15.4,
      totalUnits: Math.round(158 * baseMultiplier),
      conversionRate: 72.5
    },
    leads: {
      totalLeads: Math.round(218 * baseMultiplier),
      responseTime: 2.8,
      conversionRate: 72.5,
      followUpRate: 89.2,
      avgDaysToClose: 14.2
    },
    vehicleTypes: mockVehicleTypes.map(vt => ({
      ...vt,
      unitsSold: Math.round(vt.unitsSold * baseMultiplier),
      revenue: Math.round(vt.revenue * baseMultiplier)
    })),
    turnoverRate: 8.5,
    teamPerformance: mockTeamPerformance.map(tm => ({
      ...tm,
      leadsAssigned: Math.round(tm.leadsAssigned * baseMultiplier),
      leadsConverted: Math.round(tm.leadsConverted * baseMultiplier),
      revenue: Math.round(tm.revenue * baseMultiplier)
    })),
    financial: getFinancialMetrics(baseMultiplier)
  };
};

export const getAvailablePeriods = (): ReportPeriod[] => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  return [
    {
      type: 'week',
      startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: now.toISOString(),
      label: 'Deze week'
    },
    {
      type: 'month',
      startDate: new Date(currentYear, currentMonth, 1).toISOString(),
      endDate: now.toISOString(),
      label: 'Deze maand'
    },
    {
      type: 'year',
      startDate: new Date(currentYear, 0, 1).toISOString(),
      endDate: now.toISOString(),
      label: 'Dit jaar'
    },
    {
      type: 'month',
      startDate: new Date(currentYear, currentMonth - 1, 1).toISOString(),
      endDate: new Date(currentYear, currentMonth, 0).toISOString(),
      label: 'Vorige maand'
    },
    {
      type: 'year',
      startDate: new Date(currentYear - 1, 0, 1).toISOString(),
      endDate: new Date(currentYear - 1, 11, 31).toISOString(),
      label: 'Vorig jaar'
    }
  ];
};

export const exportReportData = async (data: PerformanceData, format: 'excel' | 'csv' | 'pdf') => {
  // Simulate export functionality
  const fileName = `financieel_rapport_${data.period.type}_${new Date().toISOString().split('T')[0]}.${format}`;
  
  console.log(`Exporting financial report as ${format}:`, data);
  
  // In a real implementation, this would generate and download the file
  return fileName;
};

export const generateFinancialAdvice = (data: PerformanceData): string[] => {
  const advice = [];
  
  if (data.financial.netMargin < 10) {
    advice.push("Nettomarges onder 10% - overweeg kostenreductie of prijsoptimalisatie");
  }
  
  if (data.financial.profitGrowth < 0) {
    advice.push("Negatieve winstgroei - focus op efficiency en nieuwe marktopportuniteiten");
  }
  
  if (data.financial.cashFlow < data.financial.netProfit * 0.8) {
    advice.push("Cashflow onder verwachting - monitor debiteuren en voorraadniveaus");
  }
  
  if (data.financial.grossMargin > 20) {
    advice.push("Sterke brutomarge - uitstekende pricing strategie wordt gehandhaafd");
  }
  
  return advice;
};
