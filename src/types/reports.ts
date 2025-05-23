
export interface ReportPeriod {
  type: 'week' | 'month' | 'year' | 'custom';
  startDate: string;
  endDate: string;
  label: string;
}

export interface SalesMetrics {
  totalSales: number;
  totalRevenue: number;
  averageMargin: number;
  totalUnits: number;
  conversionRate: number;
}

export interface LeadMetrics {
  totalLeads: number;
  responseTime: number;
  conversionRate: number;
  followUpRate: number;
  avgDaysToClose: number;
}

export interface VehicleTypeMetrics {
  type: string;
  unitsSold: number;
  revenue: number;
  margin: number;
  percentage: number;
}

export interface PerformanceData {
  period: ReportPeriod;
  sales: SalesMetrics;
  leads: LeadMetrics;
  vehicleTypes: VehicleTypeMetrics[];
  turnoverRate: number;
  teamPerformance: TeamMember[];
}

export interface TeamMember {
  id: string;
  name: string;
  leadsAssigned: number;
  leadsConverted: number;
  revenue: number;
  responseTime: number;
}

export interface ReportExport {
  format: 'excel' | 'csv' | 'pdf';
  data: PerformanceData;
  fileName: string;
}
