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
  
  // Inruil tracking
  tradeInCount: number;           // Aantal inruil verkopen
  normalPurchaseCount: number;    // Aantal normale inkoop verkopen
  tradeInRevenue: number;         // Omzet uit inruil
  normalPurchaseRevenue: number;  // Omzet uit normale inkoop
  tradeInProfit: number;          // Winst uit inruil
  normalPurchaseProfit: number;   // Winst uit normale inkoop
  tradeInProfitMargin: number;    // Winstmarge inruil (%)
  normalPurchaseProfitMargin: number; // Winstmarge normale inkoop (%)
  
  vehicles: Array<{
    id: string;
    brand: string;
    model: string;
    status: string;
    selling_price: number;
    sold_date: string | null;
    created_at: string;
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

    // CRITICAL: Only fetch verkocht_b2b and verkocht_b2c, NOT afgeleverd
    // Afgeleverd represents delivery date, not sales date
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("id, brand, model, status, selling_price, sold_date, created_at, details")
      .in("status", ["verkocht_b2b", "verkocht_b2c"])
      .order("sold_date", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Error fetching sales data:", error);
      throw error;
    }

    // Filter vehicles by sold_date if available, otherwise use created_at
    // Only count vehicles within the date range
    const filteredVehicles = vehicles?.filter(v => {
      const dateToCheck = v.sold_date ? new Date(v.sold_date) : new Date(v.created_at || startDate);
      return dateToCheck >= startDate && dateToCheck <= endDate;
    }) || [];

    // Calculate metrics
    const totalVehicles = filteredVehicles?.length || 0;
    const totalRevenue = filteredVehicles?.reduce((sum, v) => sum + (v.selling_price || 0), 0) || 0;
    
    // Calculate total cost from purchase price in details
    const totalCost = filteredVehicles?.reduce((sum, v) => {
      if (!v.details || typeof v.details !== 'object') return sum;
      const details = v.details as any;
      const purchasePrice = details.purchasePrice || 0;
      return sum + purchasePrice;
    }, 0) || 0;

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Count B2B vs B2C
    const b2bCount = filteredVehicles?.filter((v) => v.status === "verkocht_b2b").length || 0;
    const b2cCount = filteredVehicles?.filter((v) => v.status === "verkocht_b2c").length || 0;

    const averageSalePrice = totalVehicles > 0 ? totalRevenue / totalVehicles : 0;

    // Filter inruil vs normale inkoop
    const tradeInVehicles = filteredVehicles?.filter(v => {
      if (!v.details || typeof v.details !== 'object' || Array.isArray(v.details)) return false;
      const details = v.details as Record<string, any>;
      return details.isTradeIn === true;
    }) || [];

    const normalPurchaseVehicles = filteredVehicles?.filter(v => {
      if (!v.details || typeof v.details !== 'object' || Array.isArray(v.details)) return true;
      const details = v.details as Record<string, any>;
      return !details.isTradeIn;
    }) || [];

    const tradeInCount = tradeInVehicles.length;
    const normalPurchaseCount = normalPurchaseVehicles.length;

    const tradeInRevenue = tradeInVehicles.reduce(
      (sum, v) => sum + (v.selling_price || 0), 0
    );

    const normalPurchaseRevenue = normalPurchaseVehicles.reduce(
      (sum, v) => sum + (v.selling_price || 0), 0
    );

    // Calculate trade-in costs and profits
    const tradeInCost = tradeInVehicles.reduce((sum, v) => {
      if (!v.details || typeof v.details !== 'object') return sum;
      const details = v.details as any;
      return sum + (details.purchasePrice || 0);
    }, 0);

    const normalPurchaseCost = normalPurchaseVehicles.reduce((sum, v) => {
      if (!v.details || typeof v.details !== 'object') return sum;
      const details = v.details as any;
      return sum + (details.purchasePrice || 0);
    }, 0);

    const tradeInProfit = tradeInRevenue - tradeInCost;
    const normalPurchaseProfit = normalPurchaseRevenue - normalPurchaseCost;
    
    const tradeInProfitMargin = tradeInRevenue > 0 ? (tradeInProfit / tradeInRevenue) * 100 : 0;
    const normalPurchaseProfitMargin = normalPurchaseRevenue > 0 ? (normalPurchaseProfit / normalPurchaseRevenue) * 100 : 0;

    return {
      totalVehicles,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      b2bCount,
      b2cCount,
      averageSalePrice,
      tradeInCount,
      normalPurchaseCount,
      tradeInRevenue,
      normalPurchaseRevenue,
      tradeInProfit,
      normalPurchaseProfit,
      tradeInProfitMargin,
      normalPurchaseProfitMargin,
      vehicles: filteredVehicles || [],
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

    // CRITICAL: Only fetch verkocht_b2b and verkocht_b2c, NOT afgeleverd
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("status, selling_price, sold_date, created_at")
      .in("status", ["verkocht_b2b", "verkocht_b2c"]);

    if (error) throw error;

    // Filter by year - use sold_date if available, otherwise created_at
    const yearVehicles = vehicles?.filter(v => {
      const dateToCheck = v.sold_date ? new Date(v.sold_date) : new Date(v.created_at || startDate);
      return dateToCheck >= startDate && dateToCheck <= endDate;
    }) || [];

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

    yearVehicles?.forEach((vehicle) => {
      const dateToCheck = vehicle.sold_date ? new Date(vehicle.sold_date) : new Date(vehicle.created_at || startDate);
      const month = dateToCheck.getMonth();
      
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
