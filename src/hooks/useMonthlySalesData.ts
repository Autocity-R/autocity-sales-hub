import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfYear, endOfYear, eachMonthOfInterval, format } from "date-fns";
import { nl } from "date-fns/locale";

export const useMonthlySalesData = () => {
  return useQuery({
    queryKey: ["monthly-sales"],
    queryFn: async () => {
      const now = new Date();
      const yearStart = startOfYear(now);
      const yearEnd = endOfYear(now);

      // Get all months of the current year
      const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

      // Fetch all sold vehicles for this year
      const { data: vehicles, error } = await supabase
        .from("vehicles")
        .select("status, sold_date")
        .in("status", ["verkocht_b2b", "verkocht_b2c", "afgeleverd"])
        .gte("sold_date", yearStart.toISOString())
        .lte("sold_date", yearEnd.toISOString())
        .not("sold_date", "is", null);

      if (error) throw error;

      // Group by month and B2B/B2C
      const monthlyData = months.map((month) => {
        const monthStr = format(month, "yyyy-MM");
        
        const monthVehicles = vehicles?.filter((v) => {
          if (!v.sold_date) return false;
          const soldMonth = format(new Date(v.sold_date), "yyyy-MM");
          return soldMonth === monthStr;
        }) || [];

        const b2b = monthVehicles.filter(
          (v) => v.status === "verkocht_b2b"
        ).length;
        
        const b2c = monthVehicles.filter(
          (v) => v.status === "verkocht_b2c" || v.status === "afgeleverd"
        ).length;

        return {
          month: format(month, "MMM", { locale: nl }),
          b2b,
          b2c,
          total: b2b + b2c,
        };
      });

      return monthlyData;
    },
    refetchInterval: 60000, // Refresh every minute
  });
};
