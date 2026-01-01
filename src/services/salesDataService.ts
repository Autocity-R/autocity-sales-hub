import { supabase } from "@/integrations/supabase/client";
import { ReportPeriod } from "@/types/reports";

export interface SalesData {
  totalVehicles: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  b2bCount: number;
  b2cCount: number;
  averageSalePrice: number;
  
  // B2B specifiek
  b2bRevenue: number;
  b2bCost: number;
  b2bProfit: number;
  b2bProfitMargin: number;
  
  // B2C specifiek
  b2cRevenue: number;
  b2cCost: number;
  b2cProfit: number;
  b2cProfitMargin: number;
  
  // Inruil tracking
  tradeInCount: number;
  normalPurchaseCount: number;
  tradeInRevenue: number;
  normalPurchaseRevenue: number;
  tradeInProfit: number;
  normalPurchaseProfit: number;
  tradeInProfitMargin: number;
  normalPurchaseProfitMargin: number;
  
  // Garantiepakket tracking (B2C only)
  warrantyPackageCount: number;
  warrantyPackageRevenue: number;
  warrantyConversionRate: number;
  totalRevenueWithWarranty: number;
  totalProfitWithWarranty: number;
  
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
  async getSalesData(period: ReportPeriod): Promise<SalesData> {
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    // Count all sold vehicles: verkocht_b2b, verkocht_b2c, and afgeleverd
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("id, brand, model, status, selling_price, sold_date, created_at, details")
      .in("status", ["verkocht_b2b", "verkocht_b2c", "afgeleverd"])
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

    // Filter B2B vs B2C vehicles (including afgeleverd based on salesType)
    const b2bVehicles = filteredVehicles?.filter((v) => {
      const details = v.details as any;
      return v.status === "verkocht_b2b" || 
             (v.status === "afgeleverd" && details?.salesType === "b2b");
    }) || [];
    
    const b2cVehiclesAll = filteredVehicles?.filter((v) => {
      const details = v.details as any;
      return v.status === "verkocht_b2c" || 
             (v.status === "afgeleverd" && (!details?.salesType || details?.salesType === "b2c"));
    }) || [];

    const b2bCount = b2bVehicles.length;
    const b2cCount = b2cVehiclesAll.length;

    // B2B metrics
    const b2bRevenue = b2bVehicles.reduce((sum, v) => sum + (v.selling_price || 0), 0);
    const b2bCost = b2bVehicles.reduce((sum, v) => {
      const details = v.details as any;
      return sum + (details?.purchasePrice || 0);
    }, 0);
    const b2bProfit = b2bRevenue - b2bCost;
    const b2bProfitMargin = b2bRevenue > 0 ? (b2bProfit / b2bRevenue) * 100 : 0;

    // B2C metrics
    const b2cRevenue = b2cVehiclesAll.reduce((sum, v) => sum + (v.selling_price || 0), 0);
    const b2cCost = b2cVehiclesAll.reduce((sum, v) => {
      const details = v.details as any;
      return sum + (details?.purchasePrice || 0);
    }, 0);
    const b2cProfit = b2cRevenue - b2cCost;
    const b2cProfitMargin = b2cRevenue > 0 ? (b2cProfit / b2cRevenue) * 100 : 0;

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

    // Garantiepakket berekeningen (B2C only) - hergebruik b2cVehiclesAll
    const b2cVehicles = b2cVehiclesAll;

    const vehiclesWithWarrantyPackage = b2cVehicles.filter(v => {
      const details = v.details as any;
      return details?.warrantyPackagePrice && details.warrantyPackagePrice > 0;
    });

    const warrantyPackageCount = vehiclesWithWarrantyPackage.length;
    const warrantyPackageRevenue = vehiclesWithWarrantyPackage.reduce((sum, v) => {
      const details = v.details as any;
      return sum + (details?.warrantyPackagePrice || 0);
    }, 0);

    const warrantyConversionRate = b2cVehicles.length > 0 
      ? (warrantyPackageCount / b2cVehicles.length) * 100 
      : 0;

    const totalRevenueWithWarranty = totalRevenue + warrantyPackageRevenue;
    const totalProfitWithWarranty = totalProfit + warrantyPackageRevenue; // 100% marge op pakketten

    return {
      totalVehicles,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      b2bCount,
      b2cCount,
      averageSalePrice,
      b2bRevenue,
      b2bCost,
      b2bProfit,
      b2bProfitMargin,
      b2cRevenue,
      b2cCost,
      b2cProfit,
      b2cProfitMargin,
      tradeInCount,
      normalPurchaseCount,
      tradeInRevenue,
      normalPurchaseRevenue,
      tradeInProfit,
      normalPurchaseProfit,
      tradeInProfitMargin,
      normalPurchaseProfitMargin,
      warrantyPackageCount,
      warrantyPackageRevenue,
      warrantyConversionRate,
      totalRevenueWithWarranty,
      totalProfitWithWarranty,
      vehicles: filteredVehicles || [],
    };
  },

  async getMonthlySalesBreakdown(period: ReportPeriod): Promise<Array<{
    month: number;
    monthName: string;
    b2b: number;
    b2c: number;
    total: number;
    revenue: number;
  }>> {
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    // Count all sold vehicles: verkocht_b2b, verkocht_b2c, and afgeleverd
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("status, selling_price, sold_date, created_at, details")
      .in("status", ["verkocht_b2b", "verkocht_b2c", "afgeleverd"]);

    if (error) throw error;

    // Filter by period - use sold_date if available, otherwise created_at
    const periodVehicles = vehicles?.filter(v => {
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

    periodVehicles?.forEach((vehicle) => {
      const dateToCheck = vehicle.sold_date ? new Date(vehicle.sold_date) : new Date(vehicle.created_at || startDate);
      const month = dateToCheck.getMonth();
      
      // Categorize based on status and salesType for afgeleverd
      const isB2B = vehicle.status === "verkocht_b2b" || 
                    (vehicle.status === "afgeleverd" && (vehicle as any).details?.salesType === "b2b");
      
      if (isB2B) {
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
