import { supabase } from "@/integrations/supabase/client";
import { PerformanceData, ReportPeriod } from "@/types/reports";

/**
 * Service for generating reports from actual system data
 */
export class SystemReportsService {
  /**
   * Get reports data from actual vehicle sales in the system
   */
  async getReportsData(period: ReportPeriod): Promise<PerformanceData> {
    const { startDate, endDate } = period;

    // Fetch sold vehicles within the period
    const { data: soldVehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .in('status', ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'])
      .gte('sold_date', startDate)
      .lte('sold_date', endDate);

    if (error) {
      console.error("Error fetching sold vehicles:", error);
      throw error;
    }

    // Calculate metrics
    const totalVehiclesSold = soldVehicles?.length || 0;
    const totalRevenue = soldVehicles?.reduce((sum, v) => sum + (v.selling_price || 0), 0) || 0;
    const averageSalePrice = totalVehiclesSold > 0 ? Math.round(totalRevenue / totalVehiclesSold) : 0;

    // Calculate profit (selling_price - purchase/cost price from details)
    const totalProfit = soldVehicles?.reduce((sum, v) => {
      const sellingPrice = v.selling_price || 0;
      const purchasePrice = (v.details as any)?.purchasePrice || (v.details as any)?.kostprijs || 0;
      return sum + (sellingPrice - purchasePrice);
    }, 0) || 0;

    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

    // Group by B2B vs B2C
    const b2bSales = soldVehicles?.filter(v => v.status === 'verkocht_b2b' || v.status === 'afgeleverd' && (v.details as any)?.salesType === 'b2b').length || 0;
    const b2cSales = soldVehicles?.filter(v => v.status === 'verkocht_b2c' || v.status === 'afgeleverd' && (v.details as any)?.salesType !== 'b2b').length || 0;

    // Get top selling brands
    const brandStats = soldVehicles?.reduce((acc, v) => {
      const brand = v.brand;
      if (!acc[brand]) {
        acc[brand] = { sales: 0, revenue: 0 };
      }
      acc[brand].sales += 1;
      acc[brand].revenue += v.selling_price || 0;
      return acc;
    }, {} as Record<string, { sales: number; revenue: number }>);

    const topVehicles = Object.entries(brandStats || {})
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([brand, stats]) => ({
        brand,
        model: brand, // Using brand as model for now
        sales: stats.sales,
        revenue: stats.revenue
      }));

    // Calculate vehicle type metrics
    const vehicleTypes = Object.entries(brandStats || {})
      .map(([type, stats]) => ({
        type,
        unitsSold: stats.sales,
        revenue: stats.revenue,
        margin: 15, // Default margin, could be calculated from cost data
        percentage: totalVehiclesSold > 0 ? (stats.sales / totalVehiclesSold * 100) : 0
      }));

    // Generate monthly data for charts
    const revenueChart = this.generateMonthlyChart(soldVehicles || [], startDate, endDate);
    
    // Sales chart data
    const salesChart = [
      { category: "Deze periode", b2c: b2cSales, b2b: b2bSales }
    ];

    // Calculate growth (comparing to previous period would require additional query)
    const revenueGrowth = 0; // Placeholder

    return {
      period,
      sales: {
        totalSales: totalVehiclesSold,
        totalRevenue: Math.round(totalRevenue),
        averageMargin: Math.round(profitMargin * 10) / 10,
        totalUnits: totalVehiclesSold,
        conversionRate: 0 // Would need leads data
      },
      leads: {
        totalLeads: 0, // Would need leads data
        responseTime: 0,
        conversionRate: 0,
        followUpRate: 0,
        avgDaysToClose: 0
      },
      vehicleTypes,
      turnoverRate: 0, // Would need inventory turnover calculation
      teamPerformance: [], // Would need team performance data
      financial: {
        totalRevenue: Math.round(totalRevenue),
        totalCosts: Math.round(totalRevenue - totalProfit),
        grossProfit: Math.round(totalProfit),
        netProfit: Math.round(totalProfit * 0.7), // Estimate after operating expenses
        grossMargin: Math.round(profitMargin * 10) / 10,
        netMargin: Math.round(profitMargin * 0.7 * 10) / 10,
        operatingExpenses: Math.round(totalProfit * 0.3), // Estimate
        ebitda: Math.round(totalProfit),
        cashFlow: Math.round(totalProfit),
        profitGrowth: revenueGrowth
      },
      revenue: Math.round(totalRevenue),
      profit: Math.round(totalProfit),
      vehiclesSold: totalVehiclesSold,
      averageSalePrice,
      revenueGrowth,
      profitMargin: Math.round(profitMargin * 10) / 10,
      revenueChart,
      salesChart,
      topVehicles,
      _metadata: {
        dataSource: "System Database",
        lastUpdated: new Date().toISOString(),
        recordCounts: {
          salesInvoices: totalVehiclesSold
        }
      }
    };
  }

  /**
   * Generate monthly revenue chart data
   */
  private generateMonthlyChart(
    vehicles: any[], 
    startDate: string, 
    endDate: string
  ): Array<{ month: string; revenue: number; profit: number }> {
    const monthlyData: Record<string, { revenue: number; profit: number }> = {};
    
    vehicles.forEach(vehicle => {
      if (!vehicle.sold_date) return;
      
      const date = new Date(vehicle.sold_date);
      const monthKey = date.toLocaleDateString('nl-NL', { month: 'short' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, profit: 0 };
      }
      
      const sellingPrice = vehicle.selling_price || 0;
      const purchasePrice = (vehicle.details as any)?.purchasePrice || (vehicle.details as any)?.kostprijs || 0;
      
      monthlyData[monthKey].revenue += sellingPrice;
      monthlyData[monthKey].profit += (sellingPrice - purchasePrice);
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      revenue: Math.round(data.revenue),
      profit: Math.round(data.profit)
    }));
  }
}

export const systemReportsService = new SystemReportsService();
