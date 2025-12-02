import { supabase } from "@/integrations/supabase/client";
import { startOfYear, endOfYear, format } from "date-fns";

export interface WarrantyPackageStats {
  totalPackagesSold: number;
  totalPackageRevenue: number;
  conversionRate: number;
  avgPackagePrice: number;
  totalB2CSales: number;
  
  byPackageType: Array<{
    packageName: string;
    count: number;
    revenue: number;
    avgPrice: number;
  }>;
  
  monthlyTrend: Array<{
    month: string;
    packagesCount: number;
    b2cSalesCount: number;
    revenue: number;
    conversionRate: number;
  }>;
}

export const warrantyPackageService = {
  async getWarrantyPackageStats(year: number): Promise<WarrantyPackageStats> {
    const startDate = startOfYear(new Date(year, 0, 1));
    const endDate = endOfYear(new Date(year, 0, 1));

    // Fetch all B2C sold/delivered vehicles for the year
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("id, brand, model, status, selling_price, sold_date, created_at, details")
      .in("status", ["verkocht_b2c", "afgeleverd"]);

    if (error) {
      console.error("Error fetching warranty package data:", error);
      throw error;
    }

    // Filter to B2C only and within year
    const b2cVehicles = vehicles?.filter(v => {
      const details = v.details as any;
      const isB2C = v.status === "verkocht_b2c" || 
                   (v.status === "afgeleverd" && (!details?.salesType || details?.salesType === "b2c"));
      
      const dateToCheck = v.sold_date ? new Date(v.sold_date) : new Date(v.created_at || startDate);
      const inDateRange = dateToCheck >= startDate && dateToCheck <= endDate;
      
      return isB2C && inDateRange;
    }) || [];

    // Vehicles with warranty packages
    const vehiclesWithPackage = b2cVehicles.filter(v => {
      const details = v.details as any;
      return details?.warrantyPackagePrice && details.warrantyPackagePrice > 0;
    });

    const totalB2CSales = b2cVehicles.length;
    const totalPackagesSold = vehiclesWithPackage.length;
    const totalPackageRevenue = vehiclesWithPackage.reduce((sum, v) => {
      const details = v.details as any;
      return sum + (details?.warrantyPackagePrice || 0);
    }, 0);

    const conversionRate = totalB2CSales > 0 ? (totalPackagesSold / totalB2CSales) * 100 : 0;
    const avgPackagePrice = totalPackagesSold > 0 ? totalPackageRevenue / totalPackagesSold : 0;

    // Group by package type
    const packageTypeMap = new Map<string, { count: number; revenue: number }>();
    vehiclesWithPackage.forEach(v => {
      const details = v.details as any;
      const packageName = details?.warrantyPackage || "Onbekend pakket";
      const price = details?.warrantyPackagePrice || 0;
      
      const existing = packageTypeMap.get(packageName) || { count: 0, revenue: 0 };
      packageTypeMap.set(packageName, {
        count: existing.count + 1,
        revenue: existing.revenue + price
      });
    });

    const byPackageType = Array.from(packageTypeMap.entries()).map(([name, data]) => ({
      packageName: name,
      count: data.count,
      revenue: data.revenue,
      avgPrice: data.count > 0 ? data.revenue / data.count : 0
    })).sort((a, b) => b.count - a.count);

    // Monthly trend
    const monthNames = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
    const monthlyData = monthNames.map((month, index) => {
      const monthVehicles = b2cVehicles.filter(v => {
        const dateToCheck = v.sold_date ? new Date(v.sold_date) : new Date(v.created_at || startDate);
        return dateToCheck.getMonth() === index;
      });

      const monthPackages = monthVehicles.filter(v => {
        const details = v.details as any;
        return details?.warrantyPackagePrice && details.warrantyPackagePrice > 0;
      });

      const monthRevenue = monthPackages.reduce((sum, v) => {
        const details = v.details as any;
        return sum + (details?.warrantyPackagePrice || 0);
      }, 0);

      return {
        month,
        packagesCount: monthPackages.length,
        b2cSalesCount: monthVehicles.length,
        revenue: monthRevenue,
        conversionRate: monthVehicles.length > 0 ? (monthPackages.length / monthVehicles.length) * 100 : 0
      };
    });

    return {
      totalPackagesSold,
      totalPackageRevenue,
      conversionRate,
      avgPackagePrice,
      totalB2CSales,
      byPackageType,
      monthlyTrend: monthlyData
    };
  }
};
