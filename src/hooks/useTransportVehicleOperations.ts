import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PaymentStatus } from "@/types/inventory";
import { supabase } from "@/integrations/supabase/client";

export const useTransportVehicleOperations = () => {
  const queryClient = useQueryClient();
  
  const bulkAssignTransporterMutation = useMutation({
    mutationFn: async ({ 
      vehicleIds, 
      transporterId 
    }: { 
      vehicleIds: string[]; 
      transporterId: string;
    }) => {
      // Update meerdere voertuigen met de transporteur
      const updates = vehicleIds.map(vehicleId => 
        supabase
          .from('vehicles')
          .update({ transporter_id: transporterId })
          .eq('id', vehicleId)
      );
      
      const results = await Promise.all(updates);
      
      // Check voor fouten
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`${errors.length} voertuigen konden niet worden bijgewerkt`);
      }
      
      return results;
    },
    onSuccess: (_, variables) => {
      toast.success(`Transporteur toegewezen aan ${variables.vehicleIds.length} voertuig(en)`);
      queryClient.invalidateQueries({ queryKey: ["transportVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error) => {
      toast.error("Fout bij toewijzen transporteur");
      console.error("Error assigning transporter:", error);
    }
  });
  
  const updatePurchasePaymentStatusMutation = useMutation({
    mutationFn: async ({ 
      vehicleId, 
      status 
    }: { 
      vehicleId: string; 
      status: PaymentStatus;
    }) => {
      // ✅ Update PURCHASE payment status voor Transport (inkoop betaling)
      const { data: currentVehicle, error: fetchError } = await supabase
        .from('vehicles')
        .select('details')
        .eq('id', vehicleId)
        .single();

      if (fetchError) throw fetchError;

      const updatedDetails = {
        ...(currentVehicle?.details as Record<string, any> || {}),
        purchase_payment_status: status  // ← Specifiek voor INKOOP betaling
      };

      const { data, error } = await supabase
        .from('vehicles')
        .update({ details: updatedDetails })
        .eq('id', vehicleId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Betaalstatus leverancier bijgewerkt");
      queryClient.invalidateQueries({ queryKey: ["transportVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error) => {
      toast.error("Fout bij het bijwerken van de betaalstatus");
      console.error("Error updating purchase payment status:", error);
    }
  });
  
  const handleUpdatePurchasePaymentStatus = (vehicleId: string, status: PaymentStatus) => {
    updatePurchasePaymentStatusMutation.mutate({ vehicleId, status });
  };

  const handleBulkAssignTransporter = (vehicleIds: string[], transporterId: string) => {
    bulkAssignTransporterMutation.mutate({ vehicleIds, transporterId });
  };
  
  return {
    handleUpdatePurchasePaymentStatus,
    handleBulkAssignTransporter,
    updatePurchasePaymentStatusMutation,
    bulkAssignTransporterMutation
  };
};
