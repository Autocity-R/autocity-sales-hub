import { supabase } from "@/integrations/supabase/client";
import { ReportPeriod, PurchaseAnalyticsData, PurchaserStats } from "@/types/reports";

class PurchaseReportsService {
  async getPurchaseAnalytics(period: ReportPeriod): Promise<PurchaseAnalyticsData> {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select(`
        id,
        brand,
        model,
        purchased_by_user_id,
        purchased_by_name,
        purchase_date,
        purchase_price,
        selling_price,
        status,
        sold_date,
        created_at,
        details
      `)
      .or(`purchase_date.gte.${period.startDate},purchase_date.lte.${period.endDate},purchase_date.is.null`)
      .not('purchased_by_user_id', 'is', null);

    if (error) {
      console.error("Error fetching purchase analytics:", error);
      throw error;
    }

    if (!vehicles || vehicles.length === 0) {
      return this.getEmptyAnalyticsData();
    }

    const purchaserStats = this.groupByPurchaser(vehicles);
    const totals = this.calculateTotals(vehicles);
    
    return {
      totalPurchaseValue: totals.totalPurchaseValue,
      totalRealizedProfit: totals.totalRealizedProfit,
      averageMargin: totals.averageMargin,
      totalInStock: totals.totalInStock,
      purchasers: purchaserStats,
      byBuyer: this.prepareBuyerChart(purchaserStats),
      
      // Reguliere inkoop totalen
      regularTotalPurchased: totals.regularTotalPurchased,
      regularTotalSold: totals.regularTotalSold,
      regularTotalPurchaseValue: totals.regularTotalPurchaseValue,
      regularTotalSalesValue: totals.regularTotalSalesValue,
      regularTotalProfit: totals.regularTotalProfit,
      regularAverageMargin: totals.regularAverageMargin,
      regularInStock: totals.regularInStock,
      
      // Inruil totalen
      tradeInTotalPurchased: totals.tradeInTotalPurchased,
      tradeInTotalSold: totals.tradeInTotalSold,
      tradeInTotalPurchaseValue: totals.tradeInTotalPurchaseValue,
      tradeInTotalSalesValue: totals.tradeInTotalSalesValue,
      tradeInTotalProfit: totals.tradeInTotalProfit,
      tradeInAverageMargin: totals.tradeInAverageMargin,
      tradeInInStock: totals.tradeInInStock
    };
  }

  private getEmptyAnalyticsData(): PurchaseAnalyticsData {
    return {
      totalPurchaseValue: 0,
      totalRealizedProfit: 0,
      averageMargin: 0,
      totalInStock: 0,
      purchasers: [],
      byBuyer: [],
      regularTotalPurchased: 0,
      regularTotalSold: 0,
      regularTotalPurchaseValue: 0,
      regularTotalSalesValue: 0,
      regularTotalProfit: 0,
      regularAverageMargin: 0,
      regularInStock: 0,
      tradeInTotalPurchased: 0,
      tradeInTotalSold: 0,
      tradeInTotalPurchaseValue: 0,
      tradeInTotalSalesValue: 0,
      tradeInTotalProfit: 0,
      tradeInAverageMargin: 0,
      tradeInInStock: 0
    };
  }

  private isTradeIn(vehicle: any): boolean {
    const details = vehicle.details as Record<string, any> | null;
    return details?.isTradeIn === true;
  }

  private groupByPurchaser(vehicles: any[]): PurchaserStats[] {
    const grouped = new Map<string, PurchaserStats>();
    
    vehicles.forEach(vehicle => {
      const buyerId = vehicle.purchased_by_user_id || 'unknown';
      const buyerName = vehicle.purchased_by_name || 'Onbekend';
      const isTradeIn = this.isTradeIn(vehicle);
      
      if (!grouped.has(buyerId)) {
        grouped.set(buyerId, {
          id: buyerId,
          name: buyerName,
          totalPurchased: 0,
          totalPurchaseValue: 0,
          sold: 0,
          totalSalesValue: 0,
          profit: 0,
          profitMargin: 0,
          inStock: 0,
          stockValue: 0,
          avgPurchasePrice: 0,
          avgSalesPrice: 0,
          // Regulier
          regularPurchased: 0,
          regularSold: 0,
          regularPurchaseValue: 0,
          regularSalesValue: 0,
          regularProfit: 0,
          regularMargin: 0,
          regularInStock: 0,
          regularStockValue: 0,
          // Inruil
          tradeInPurchased: 0,
          tradeInSold: 0,
          tradeInPurchaseValue: 0,
          tradeInSalesValue: 0,
          tradeInProfit: 0,
          tradeInMargin: 0,
          tradeInInStock: 0,
          tradeInStockValue: 0
        });
      }
      
      const stats = grouped.get(buyerId)!;
      const purchasePrice = vehicle.purchase_price || 0;
      const sellingPrice = vehicle.selling_price || 0;
      const isSold = ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(vehicle.status);
      
      // Totalen bijwerken
      stats.totalPurchased++;
      stats.totalPurchaseValue += purchasePrice;
      
      if (isSold) {
        stats.sold++;
        stats.totalSalesValue += sellingPrice;
        stats.profit += sellingPrice - purchasePrice;
      } else {
        stats.inStock++;
        stats.stockValue += purchasePrice;
      }
      
      // Regulier vs Inruil splitsen
      if (isTradeIn) {
        stats.tradeInPurchased++;
        stats.tradeInPurchaseValue += purchasePrice;
        
        if (isSold) {
          stats.tradeInSold++;
          stats.tradeInSalesValue += sellingPrice;
          stats.tradeInProfit += sellingPrice - purchasePrice;
        } else {
          stats.tradeInInStock++;
          stats.tradeInStockValue += purchasePrice;
        }
      } else {
        stats.regularPurchased++;
        stats.regularPurchaseValue += purchasePrice;
        
        if (isSold) {
          stats.regularSold++;
          stats.regularSalesValue += sellingPrice;
          stats.regularProfit += sellingPrice - purchasePrice;
        } else {
          stats.regularInStock++;
          stats.regularStockValue += purchasePrice;
        }
      }
    });
    
    // Marges berekenen
    grouped.forEach(stats => {
      stats.avgPurchasePrice = stats.totalPurchased > 0 
        ? stats.totalPurchaseValue / stats.totalPurchased 
        : 0;
      
      if (stats.sold > 0) {
        stats.avgSalesPrice = stats.totalSalesValue / stats.sold;
        stats.profitMargin = stats.totalSalesValue > 0 
          ? (stats.profit / stats.totalSalesValue) * 100 
          : 0;
      }
      
      // Regulier marge
      if (stats.regularSold > 0 && stats.regularSalesValue > 0) {
        stats.regularMargin = (stats.regularProfit / stats.regularSalesValue) * 100;
      }
      
      // Inruil marge
      if (stats.tradeInSold > 0 && stats.tradeInSalesValue > 0) {
        stats.tradeInMargin = (stats.tradeInProfit / stats.tradeInSalesValue) * 100;
      }
    });
    
    return Array.from(grouped.values()).sort((a, b) => b.totalPurchased - a.totalPurchased);
  }

  private calculateTotals(vehicles: any[]) {
    let totalPurchaseValue = 0;
    let totalRealizedProfit = 0;
    let totalSalesValue = 0;
    let soldCount = 0;
    let totalInStock = 0;
    
    // Regulier
    let regularTotalPurchased = 0;
    let regularTotalSold = 0;
    let regularTotalPurchaseValue = 0;
    let regularTotalSalesValue = 0;
    let regularTotalProfit = 0;
    let regularInStock = 0;
    
    // Inruil
    let tradeInTotalPurchased = 0;
    let tradeInTotalSold = 0;
    let tradeInTotalPurchaseValue = 0;
    let tradeInTotalSalesValue = 0;
    let tradeInTotalProfit = 0;
    let tradeInInStock = 0;

    vehicles.forEach(vehicle => {
      const purchasePrice = vehicle.purchase_price || 0;
      const sellingPrice = vehicle.selling_price || 0;
      const isSold = ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(vehicle.status);
      const isTradeIn = this.isTradeIn(vehicle);
      
      totalPurchaseValue += purchasePrice;
      
      if (isSold) {
        totalSalesValue += sellingPrice;
        totalRealizedProfit += sellingPrice - purchasePrice;
        soldCount++;
      } else {
        totalInStock++;
      }
      
      if (isTradeIn) {
        tradeInTotalPurchased++;
        tradeInTotalPurchaseValue += purchasePrice;
        
        if (isSold) {
          tradeInTotalSold++;
          tradeInTotalSalesValue += sellingPrice;
          tradeInTotalProfit += sellingPrice - purchasePrice;
        } else {
          tradeInInStock++;
        }
      } else {
        regularTotalPurchased++;
        regularTotalPurchaseValue += purchasePrice;
        
        if (isSold) {
          regularTotalSold++;
          regularTotalSalesValue += sellingPrice;
          regularTotalProfit += sellingPrice - purchasePrice;
        } else {
          regularInStock++;
        }
      }
    });

    // Marges berekenen
    const averageMargin = totalSalesValue > 0 
      ? (totalRealizedProfit / totalSalesValue) * 100 
      : 0;
    
    const regularAverageMargin = regularTotalSalesValue > 0 
      ? (regularTotalProfit / regularTotalSalesValue) * 100 
      : 0;
    
    const tradeInAverageMargin = tradeInTotalSalesValue > 0 
      ? (tradeInTotalProfit / tradeInTotalSalesValue) * 100 
      : 0;

    return {
      totalPurchaseValue,
      totalRealizedProfit,
      averageMargin,
      totalInStock,
      regularTotalPurchased,
      regularTotalSold,
      regularTotalPurchaseValue,
      regularTotalSalesValue,
      regularTotalProfit,
      regularAverageMargin,
      regularInStock,
      tradeInTotalPurchased,
      tradeInTotalSold,
      tradeInTotalPurchaseValue,
      tradeInTotalSalesValue,
      tradeInTotalProfit,
      tradeInAverageMargin,
      tradeInInStock
    };
  }

  private prepareBuyerChart(purchaserStats: PurchaserStats[]) {
    return purchaserStats.map(p => ({
      name: p.name,
      value: p.totalPurchased
    }));
  }
}

export const purchaseReportsService = new PurchaseReportsService();
