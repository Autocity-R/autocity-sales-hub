import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export interface SalesData {
  totalVehicles: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  b2bCount: number;
  b2cCount: number;
  averageSalePrice: number;
  vehicles: Array<{
    id: string;
    brand: string;
    model: string;
    status: string;
    selling_price: number;
    sold_date: string;
    details: any;
  }>;
}

export const salesDataService = {
  async getSalesData(
    periodType: "week" | "month" | "year",
    customStart?: Date,
    customEnd?: Date
  ): Promise<SalesData> {
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    // Determine date range based on period type
    if (customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
    } else {
      switch (periodType) {
        case "week":
          startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "year":
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
        default:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
      }
    }

    // Fetch sold vehicles - only count each vehicle once based on sold_date
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("id, brand, model, status, selling_price, sold_date, details")
      .in("status", ["verkocht_b2b", "verkocht_b2c", "afgeleverd"])
      .not("sold_date", "is", null)
      .gte("sold_date", startDate.toISOString())
      .lte("sold_date", endDate.toISOString())
      .order("sold_date", { ascending: false });

    if (error) {
      console.error("Error fetching sales data:", error);
      throw error;
    }

    // Calculate metrics
    const totalVehicles = vehicles?.length || 0;
    const totalRevenue = vehicles?.reduce((sum, v) => sum + (v.selling_price || 0), 0) || 0;
    
    // Calculate total cost from purchase price in details
    const totalCost = vehicles?.reduce((sum, v) => {
      if (!v.details || typeof v.details !== 'object') return sum;
      const details = v.details as any;
      const purchasePrice = details.purchasePrice || 0;
      return sum + purchasePrice;
    }, 0) || 0;

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Count B2B vs B2C
    const b2bCount = vehicles?.filter((v) => v.status === "verkocht_b2b").length || 0;
    const b2cCount = vehicles?.filter((v) => 
      v.status === "verkocht_b2c" || v.status === "afgeleverd"
    ).length || 0;

    const averageSalePrice = totalVehicles > 0 ? totalRevenue / totalVehicles : 0;

    return {
      totalVehicles,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      b2bCount,
      b2cCount,
      averageSalePrice,
      vehicles: vehicles || [],
    };
  },

  async getMonthlySalesBreakdown(year: number): Promise<Array<{
    month: number;
    monthName: string;
    b2b: number;
    b2c: number;
    total: number;
    revenue: number;
  }>> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("status, selling_price, sold_date")
      .in("status", ["verkocht_b2b", "verkocht_b2c", "afgeleverd"])
      .not("sold_date", "is", null)
      .gte("sold_date", startDate.toISOString())
      .lte("sold_date", endDate.toISOString());

    if (error) throw error;

    const monthNames = [
      "Jan", "Feb", "Mrt", "Apr", "Mei", "Jun",
      "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"
    ];

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: monthNames[i],
      b2b: 0,
      b2c: 0,
      total: 0,
      revenue: 0,
    }));

    vehicles?.forEach((vehicle) => {
      const soldDate = new Date(vehicle.sold_date);
      const month = soldDate.getMonth();
      
      if (vehicle.status === "verkocht_b2b") {
        monthlyData[month].b2b++;
      } else {
        monthlyData[month].b2c++;
      }
      
      monthlyData[month].total++;
      monthlyData[month].revenue += vehicle.selling_price || 0;
    });

    return monthlyData;
  },
};
