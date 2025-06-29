
import { 
  ExactOnlineSalesInvoice, 
  ExactOnlinePurchaseInvoice, 
  ExactOnlinePayment 
} from "@/types/exactOnline";
import { 
  PerformanceData, 
  FinancialMetrics, 
  SalesMetrics, 
  ReportPeriod 
} from "@/types/reports";

export class ExactOnlineMapper {
  /**
   * Map Exact Online data to our existing PerformanceData interface
   */
  mapToPerformanceData(
    salesInvoices: ExactOnlineSalesInvoice[],
    purchaseInvoices: ExactOnlinePurchaseInvoice[],
    payments: ExactOnlinePayment[],
    period: ReportPeriod
  ): Partial<PerformanceData> {
    const financialMetrics = this.mapToFinancialMetrics(salesInvoices, purchaseInvoices);
    const salesMetrics = this.mapToSalesMetrics(salesInvoices);

    return {
      period,
      financial: financialMetrics,
      sales: salesMetrics,
      // Mock data for other fields until we implement them
      leads: {
        totalLeads: 150,
        responseTime: 2.8,
        conversionRate: 72.5,
        followUpRate: 89.2,
        avgDaysToClose: 14.2
      },
      vehicleTypes: [],
      turnoverRate: 8.5,
      teamPerformance: []
    };
  }

  /**
   * Map financial data from Exact Online invoices
   */
  private mapToFinancialMetrics(
    salesInvoices: ExactOnlineSalesInvoice[],
    purchaseInvoices: ExactOnlinePurchaseInvoice[]
  ): FinancialMetrics {
    // Calculate revenue from sales invoices
    const totalRevenue = salesInvoices.reduce((sum, invoice) => {
      return sum + (invoice.AmountDC || 0);
    }, 0);

    // Calculate costs from purchase invoices
    const totalCosts = purchaseInvoices.reduce((sum, invoice) => {
      return sum + (invoice.AmountDC || 0);
    }, 0);

    // Calculate derived metrics
    const grossProfit = totalRevenue - totalCosts;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    
    // Estimate operating expenses (this could be refined with more specific data)
    const operatingExpenses = totalCosts * 0.2; // Rough estimate
    const netProfit = grossProfit - operatingExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    // EBITDA calculation (simplified)
    const ebitda = netProfit + (totalCosts * 0.05); // Add back estimated depreciation
    
    // Cash flow (simplified calculation)
    const cashFlow = netProfit + (totalCosts * 0.08); // Add back non-cash expenses
    
    // Profit growth (would need historical data for accurate calculation)
    const profitGrowth = 12.5; // Placeholder - requires period comparison

    return {
      totalRevenue: Math.round(totalRevenue),
      totalCosts: Math.round(totalCosts),
      grossProfit: Math.round(grossProfit),
      netProfit: Math.round(netProfit),
      grossMargin: Math.round(grossMargin * 100) / 100,
      netMargin: Math.round(netMargin * 100) / 100,
      operatingExpenses: Math.round(operatingExpenses),
      ebitda: Math.round(ebitda),
      cashFlow: Math.round(cashFlow),
      profitGrowth: profitGrowth
    };
  }

  /**
   * Map sales data from Exact Online sales invoices
   */
  private mapToSalesMetrics(salesInvoices: ExactOnlineSalesInvoice[]): SalesMetrics {
    const totalSales = salesInvoices.length;
    const totalRevenue = salesInvoices.reduce((sum, invoice) => {
      return sum + (invoice.AmountDC || 0);
    }, 0);

    // Calculate average margin from VAT information (simplified)
    const totalVAT = salesInvoices.reduce((sum, invoice) => {
      return sum + (invoice.VATAmountDC || 0);
    }, 0);
    
    const averageMargin = totalRevenue > 0 ? (totalVAT / totalRevenue) * 100 : 0;
    
    // For automotive business, each invoice typically represents one vehicle
    const totalUnits = totalSales;
    
    // Conversion rate would need lead data to be accurate
    const conversionRate = 75.0; // Placeholder

    return {
      totalSales,
      totalRevenue: Math.round(totalRevenue),
      averageMargin: Math.round(averageMargin * 100) / 100,
      totalUnits,
      conversionRate
    };
  }

  /**
   * Calculate period-over-period growth
   */
  calculateGrowth(currentPeriodData: number, previousPeriodData: number): number {
    if (previousPeriodData === 0) return 0;
    return ((currentPeriodData - previousPeriodData) / previousPeriodData) * 100;
  }

  /**
   * Map Exact Online status codes to readable descriptions
   */
  mapInvoiceStatus(statusCode: number): string {
    const statusMap: Record<number, string> = {
      5: 'Concept',
      20: 'Open',
      50: 'Processed',
      90: 'Paid',
      95: 'Cancelled'
    };
    
    return statusMap[statusCode] || 'Unknown';
  }

  /**
   * Filter invoices by date range
   */
  filterByDateRange<T extends { InvoiceDate: string }>(
    invoices: T[],
    startDate: string,
    endDate: string
  ): T[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.InvoiceDate);
      return invoiceDate >= start && invoiceDate <= end;
    });
  }

  /**
   * Group invoices by month for trend analysis
   */
  groupByMonth<T extends { InvoiceDate: string; AmountDC: number }>(
    invoices: T[]
  ): Record<string, { count: number; total: number; invoices: T[] }> {
    const grouped: Record<string, { count: number; total: number; invoices: T[] }> = {};
    
    invoices.forEach(invoice => {
      const date = new Date(invoice.InvoiceDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = { count: 0, total: 0, invoices: [] };
      }
      
      grouped[monthKey].count++;
      grouped[monthKey].total += invoice.AmountDC || 0;
      grouped[monthKey].invoices.push(invoice);
    });
    
    return grouped;
  }

  /**
   * Calculate key performance indicators
   */
  calculateKPIs(salesInvoices: ExactOnlineSalesInvoice[]): {
    averageInvoiceValue: number;
    totalInvoiceCount: number;
    averageDaysToPayment: number;
    monthlyGrowthRate: number;
  } {
    const totalRevenue = salesInvoices.reduce((sum, inv) => sum + (inv.AmountDC || 0), 0);
    const totalCount = salesInvoices.length;
    const averageInvoiceValue = totalCount > 0 ? totalRevenue / totalCount : 0;

    // Calculate average days to payment (simplified - would need payment data)
    const averageDaysToPayment = 30; // Placeholder

    // Calculate monthly growth rate (simplified - would need historical comparison)
    const monthlyGrowthRate = 15.5; // Placeholder

    return {
      averageInvoiceValue: Math.round(averageInvoiceValue),
      totalInvoiceCount: totalCount,
      averageDaysToPayment,
      monthlyGrowthRate
    };
  }
}
