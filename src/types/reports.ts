
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

export interface FinancialMetrics {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  operatingExpenses: number;
  ebitda: number;
  cashFlow: number;
  profitGrowth: number;
}

export interface PerformanceData {
  period: ReportPeriod;
  sales: SalesMetrics;
  leads: LeadMetrics;
  vehicleTypes: VehicleTypeMetrics[];
  turnoverRate: number;
  teamPerformance: TeamMember[];
  financial: FinancialMetrics;
  // Additional properties for enhanced reports
  revenue?: number;
  profit?: number;
  vehiclesSold?: number;
  averageSalePrice?: number;
  revenueGrowth?: number;
  profitMargin?: number;
  revenueChart?: Array<{ month: string; revenue: number; profit: number }>;
  salesChart?: Array<{ category: string; b2c: number; b2b: number }>;
  topVehicles?: Array<{ model: string; brand: string; sales: number; revenue: number }>;
  _metadata?: {
    dataSource: string;
    lastUpdated: string;
    recordCounts?: {
      salesInvoices: number;
      purchaseInvoices?: number;
      payments?: number;
    };
  };
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

export interface PurchaserStats {
  id: string;
  name: string;
  totalPurchased: number;
  totalPurchaseValue: number;
  sold: number;
  totalSalesValue: number;
  profit: number;
  profitMargin: number;
  inStock: number;
  stockValue: number;
  avgPurchasePrice: number;
  avgSalesPrice: number;
}

export interface PurchaseAnalyticsData {
  totalPurchaseValue: number;
  totalRealizedProfit: number;
  averageMargin: number;
  totalInStock: number;
  purchasers: PurchaserStats[];
  byBuyer: Array<{ name: string; value: number }>;
}
