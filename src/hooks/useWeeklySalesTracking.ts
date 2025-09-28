import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useWeeklySalesTracking = () => {
  const queryClient = useQueryClient();

  const trackSale = useMutation({
    mutationFn: async ({
      salespersonId,
      salespersonName,
      salesType
    }: {
      salespersonId: string;
      salespersonName: string;
      salesType: 'b2b' | 'b2c';
    }) => {
      const { error } = await supabase.rpc('update_weekly_sales', {
        p_salesperson_id: salespersonId,
        p_salesperson_name: salespersonName,
        p_sales_type: salesType
      });

      if (error) {
        console.error("Error tracking weekly sale:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch weekly sales data
      queryClient.invalidateQueries({ queryKey: ["weeklySalesLeaderboard"] });
      toast.success("Verkoop geregistreerd in wekelijkse ranglijst!");
    },
    onError: (error) => {
      console.error("Failed to track weekly sale:", error);
      toast.error("Fout bij registreren verkoop in ranglijst");
    }
  });

  return {
    trackSale: trackSale.mutate,
    isTracking: trackSale.isPending
  };
};