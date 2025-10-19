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
        details,
        selling_price,
        status,
        sold_date,
        created_at
      `)
      // CRITICAL FIX: Include vehicles without purchase_date OR within period
      // This ensures vehicles with newly assigned purchasers show up
      .or(`purchase_date.gte.${period.startDate},purchase_date.lte.${period.endDate},purchase_date.is.null`)
      // Also include ALL vehicles with a purchaser assigned (critical for current data)
      .not('purchased_by_user_id', 'is', null);

    if (error) {
      console.error("Error fetching purchase analytics:", error);
      throw error;
    }

    if (!vehicles || vehicles.length === 0) {
      return {
        totalPurchaseValue: 0,
        totalRealizedProfit: 0,
        averageMargin: 0,
        totalInStock: 0,
        purchasers: [],
        byBuyer: []
      };
    }

    const purchaserStats = this.groupByPurchaser(vehicles);
    
    return {
      totalPurchaseValue: this.calculateTotalPurchaseValue(vehicles),
      totalRealizedProfit: this.calculateRealizedProfit(vehicles),
      averageMargin: this.calculateAverageMargin(vehicles),
      totalInStock: this.calculateInStock(vehicles),
      purchasers: purchaserStats,
      byBuyer: this.prepareBuyerChart(purchaserStats)
    };
  }

  private groupByPurchaser(vehicles: any[]): PurchaserStats[] {
    const grouped = new Map<string, PurchaserStats>();
    
    vehicles.forEach(vehicle => {
      const buyerId = vehicle.purchased_by_user_id || 'unknown';
      const buyerName = vehicle.purchased_by_name || 'Onbekend';
      
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
          avgSalesPrice: 0
        });
      }
      
      const stats = grouped.get(buyerId)!;
      const purchasePrice = vehicle.details?.purchasePrice || 0;
      const isSold = ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(vehicle.status);
      
      stats.totalPurchased++;
      stats.totalPurchaseValue += purchasePrice;
      
      if (isSold) {
        stats.sold++;
        stats.totalSalesValue += vehicle.selling_price || 0;
        stats.profit += (vehicle.selling_price || 0) - purchasePrice;
      } else {
        stats.inStock++;
        stats.stockValue += purchasePrice;
      }
    });
    
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
    });
    
    return Array.from(grouped.values()).sort((a, b) => b.totalPurchased - a.totalPurchased);
  }

  private calculateTotalPurchaseValue(vehicles: any[]): number {
    return vehicles.reduce((sum, v) => sum + (v.details?.purchasePrice || 0), 0);
  }

  private calculateRealizedProfit(vehicles: any[]): number {
    return vehicles
      .filter(v => ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(v.status))
      .reduce((sum, v) => {
        const purchasePrice = v.details?.purchasePrice || 0;
        const sellingPrice = v.selling_price || 0;
        return sum + (sellingPrice - purchasePrice);
      }, 0);
  }

  private calculateAverageMargin(vehicles: any[]): number {
    const soldVehicles = vehicles.filter(v => 
      ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(v.status) &&
      v.selling_price > 0
    );

    if (soldVehicles.length === 0) return 0;

    const totalMargin = soldVehicles.reduce((sum, v) => {
      const purchasePrice = v.details?.purchasePrice || 0;
      const sellingPrice = v.selling_price || 0;
      const margin = sellingPrice > 0 ? ((sellingPrice - purchasePrice) / sellingPrice) * 100 : 0;
      return sum + margin;
    }, 0);

    return totalMargin / soldVehicles.length;
  }

  private calculateInStock(vehicles: any[]): number {
    return vehicles.filter(v => 
      !['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(v.status)
    ).length;
  }

  private prepareBuyerChart(purchaserStats: PurchaserStats[]) {
    return purchaserStats.map(p => ({
      name: p.name,
      value: p.totalPurchased
    }));
  }
}

export const purchaseReportsService = new PurchaseReportsService();
