
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

// B2B/B2C Channel-specific metrics
export interface ChannelStats {
  sold: number;
  revenue: number;
  profit: number;
  margin: number;
  avgDaysToSell: number;
  annualizedROI: number;
  profitPerDay: number;
  avgPurchasePrice: number;
  avgSalesPrice: number;
  avgProfitPerVehicle: number;
}

export interface SupplierStats {
  id: string;
  name: string;
  country?: string;
  totalVehicles: number;
  sold: number;
  totalPurchaseValue: number;
  totalSalesValue: number;
  profit: number;
  profitMargin: number;
  inStock: number;
  stockValue: number;
  avgDaysInStock: number;
  avgDaysToSell: number;
  fastestSale: number | null;
  slowestSale: number | null;
  avgPurchasePrice: number;
  avgSalesPrice: number;
  roi: number;
  
  // Automotive Performance Metrics
  annualizedROI: number;        // ROI × (365 / gem. stadagen) - Jaarlijks ROI
  profitPerDay: number;         // Winst / (Verkocht × Gem. Stadagen) - Rendement per dag
  sellThroughRate: number;      // % verkocht van totaal ingekocht
  inventoryTurnover: number;    // 365 / gem. stadagen - Omloopsnelheid
  gmroi: number;                // Gross Margin ROI - Bruto marge rendement
  capitalEfficiency: number;    // Verkoopwaarde / Kapitaalbeslag
  performanceScore: number;     // Gecombineerde score (0-100)
  avgProfitPerVehicle: number;  // Gemiddelde winst per voertuig
  
  // B2B/B2C Channel Stats
  b2b: ChannelStats;
  b2c: ChannelStats;
  preferredChannel: 'b2b' | 'b2c' | 'mixed';
  channelEfficiencyGap: number; // Verschil in efficiency tussen kanalen
}

export interface SupplierAnalyticsData {
  totalSuppliers: number;
  totalVehiclesPurchased: number;
  totalInvestment: number;
  totalRealized: number;
  totalProfit: number;
  avgMargin: number;
  suppliers: SupplierStats[];
  
  // Chart data
  bySupplier: Array<{ name: string; value: number }>;
  profitBySupplier: Array<{ name: string; profit: number; margin: number }>;
  avgDaysBySupplier: Array<{ name: string; days: number }>;
  
  // Automotive chart data
  performanceRanking: Array<{ name: string; score: number; annualizedROI: number; profitPerDay: number }>;
  b2bVsB2cComparison: Array<{ name: string; b2bROI: number; b2cROI: number; b2bProfit: number; b2cProfit: number }>;
  profitPerDayChart: Array<{ name: string; profitPerDay: number; avgDays: number }>;
  
  // Summary metrics
  bestPerformer: { name: string; score: number } | null;
  fastestTurnover: { name: string; days: number } | null;
  bestAnnualizedROI: { name: string; roi: number } | null;
  highestProfitPerDay: { name: string; profitPerDay: number } | null;
  bestB2BSupplier: { name: string; roi: number } | null;
  bestB2CSupplier: { name: string; roi: number } | null;
  
  // B2B/B2C totals
  totalB2BSold: number;
  totalB2CSold: number;
  totalB2BProfit: number;
  totalB2CProfit: number;
  avgB2BMargin: number;
  avgB2CMargin: number;
}
