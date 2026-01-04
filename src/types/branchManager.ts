import { ReportPeriod } from './reports';

export interface SalesTarget {
  id: string;
  target_type: 'b2c_units' | 'b2c_revenue' | 'b2c_margin_percent' | 'upsales_revenue';
  target_period: string;
  target_value: number;
  salesperson_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  notes: string | null;
}

export interface B2CKPIData {
  // Target tracking
  b2cSalesCount: number;
  b2cSalesTarget: number;
  b2cRevenue: number;
  b2cRevenueTarget: number;
  b2cMarginPercent: number;
  b2cMarginTarget: number;
  upsalesRevenue: number;
  upsalesTarget: number;
  
  // Additional metrics
  pendingDeliveries: number;
  avgDeliveryDays: number;
  upsellRatio: number;
}

export interface B2CSalespersonVehicle {
  id: string;
  brand: string;
  model: string;
  licensePlate: string | null;
  purchasePrice: number;
  sellingPrice: number;
  margin: number;
  marginPercent: number;
  soldDate: string;
}

export interface B2CSalespersonStats {
  id: string;
  name: string;
  b2cSales: number;
  target: number;
  targetPercent: number;
  totalRevenue: number;
  totalMargin: number;
  marginPercent: number;
  upsellCount: number;
  upsellRatio: number;
  vehicles: B2CSalespersonVehicle[];
}

export interface StockAgeData {
  distribution: {
    range: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  avgDays: number;
  totalOnline: number;
  longStandingVehicles: {
    id: string;
    brand: string;
    model: string;
    licensePlate: string | null;
    daysOnline: number;
    sellingPrice: number;
    salesperson: string | null;
  }[];
}

export interface PendingDelivery {
  id: string;
  brand: string;
  model: string;
  licensePlate: string | null;
  soldDate: string;
  daysSinceSale: number;
  salesperson: string | null;
  customerName: string | null;
  isLate: boolean; // >21 dagen EN niet dismissed
  alertDismissed?: boolean;
  alertDismissedReason?: string;
}

export interface TradeInStats {
  totalTradeIns: number;
  avgResult: number;
  negativeCount: number;
  bySalesperson: {
    id: string;
    name: string;
    tradeInCount: number;
    avgResult: number;
    negativeCount: number;
  }[];
}

export interface BranchManagerAlert {
  id: string;
  type: 'margin' | 'target' | 'trade_in' | 'delivery' | 'stock_age';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  vehicleId?: string;
  salespersonId?: string;
  actionUrl?: string;
}

export interface BranchManagerDashboardData {
  kpis: B2CKPIData;
  salespersonStats: B2CSalespersonStats[];
  stockAge: StockAgeData;
  pendingDeliveries: PendingDelivery[];
  tradeIns: TradeInStats;
  alerts: BranchManagerAlert[];
  targets: SalesTarget[];
  period: ReportPeriod;
}
