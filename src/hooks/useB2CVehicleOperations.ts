
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useWeeklySalesTracking } from "@/hooks/useWeeklySalesTracking";
import { ContractOptions } from "@/types/email";
import { 
  updateVehicle,
  sendEmail,
  updateSellingPrice,
  updatePaymentStatus,
  updatePaintStatus,
  markVehicleAsDelivered,
  uploadVehicleFile,
  changeVehicleStatus,
  uploadVehiclePhoto
} from "@/services/inventoryService";
import { Vehicle, PaymentStatus, PaintStatus, FileCategory } from "@/types/inventory";

export const useB2CVehicleOperations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { trackSale } = useWeeklySalesTracking();

  const updateVehicleMutation = useMutation({
    mutationFn: (vehicle: Vehicle) => updateVehicle(vehicle),
    onSuccess: () => {
      toast({
        description: "Voertuig bijgewerkt"
      });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het bijwerken van het voertuig"
      });
      console.error("Error updating vehicle:", error);
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: ({ type, vehicleIds, contractOptions }: { type: string; vehicleIds: string[]; contractOptions?: ContractOptions }) => 
      sendEmail(type, vehicleIds, contractOptions),
    onSuccess: () => {
      toast({
        description: "E-mail verzonden"
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het verzenden van e-mail"
      });
      console.error("Error sending email:", error);
    }
  });

  const updateSellingPriceMutation = useMutation({
    mutationFn: ({ vehicleId, price }: { vehicleId: string; price: number }) => 
      updateSellingPrice(vehicleId, price),
    onSuccess: () => {
      toast({
        description: "Verkoopprijs bijgewerkt"
      });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het bijwerken van de verkoopprijs"
      });
      console.error("Error updating selling price:", error);
    }
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ vehicleId, status }: { vehicleId: string; status: PaymentStatus }) => 
      updatePaymentStatus(vehicleId, status),
    onSuccess: () => {
      toast({
        description: "Betaalstatus bijgewerkt"
      });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het bijwerken van de betaalstatus"
      });
      console.error("Error updating payment status:", error);
    }
  });

  const updatePaintStatusMutation = useMutation({
    mutationFn: ({ vehicleId, status }: { vehicleId: string; status: PaintStatus }) => 
      updatePaintStatus(vehicleId, status),
    onSuccess: () => {
      toast({
        description: "Lakstatus bijgewerkt"
      });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het bijwerken van de lakstatus"
      });
      console.error("Error updating paint status:", error);
    }
  });

  const markAsDeliveredMutation = useMutation({
    mutationFn: (vehicleId: string) => markVehicleAsDelivered(vehicleId),
    onSuccess: () => {
      toast({
        description: "Voertuig gemarkeerd als afgeleverd"
      });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["deliveredVehicles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het markeren van het voertuig als afgeleverd"
      });
      console.error("Error marking vehicle as delivered:", error);
    }
  });

  const uploadFileMutation = useMutation({
    mutationFn: ({ file, category, vehicleId }: { file: File, category: FileCategory, vehicleId: string }) =>
      uploadVehicleFile(file, category, vehicleId),
    onSuccess: () => {
      toast({
        description: "Document geüpload"
      });
      queryClient.invalidateQueries({ queryKey: ["vehicleFiles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het uploaden van het document"
      });
      console.error("Error uploading file:", error);
    }
  });

  const changeVehicleStatusMutation = useMutation({
    mutationFn: ({ vehicleId, status }: { vehicleId: string; status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad' }) => 
      changeVehicleStatus(vehicleId, status),
    onSuccess: () => {
      toast({
        description: "Voertuigstatus bijgewerkt"
      });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["b2bVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["weeklySalesLeaderboard"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het bijwerken van de voertuigstatus"
      });
      console.error("Error updating vehicle status:", error);
    }
  });

  const handleChangeStatus = async (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => {
    // Find the vehicle to get info for validation and tracking
    const currentVehicles = queryClient.getQueryData<Vehicle[]>(["b2cVehicles"]) || [];
    const vehicle = currentVehicles.find(v => v.id === vehicleId);
    
    console.log(`🚗 Changing vehicle ${vehicleId} status to ${status}`);
    console.log(`🔍 Vehicle validation for ${vehicleId}:`, {
      hasCustomer: !!vehicle?.customerId,
      hasSalesperson: !!vehicle?.salespersonId,
      salespersonName: vehicle?.salespersonName,
      currentStatus: vehicle?.salesStatus
    });
    
    // Validation: Cannot sell vehicle without customer linked
    if ((status === 'verkocht_b2b' || status === 'verkocht_b2c') && vehicle) {
      if (!vehicle.customerId) {
        console.error(`❌ Sale blocked: Vehicle ${vehicleId} has no customer linked`);
        toast({
          variant: "destructive",
          description: "Kan voertuig niet verkopen: er is geen klant gekoppeld"
        });
        return;
      }
      if (!vehicle.salespersonId || !vehicle.salespersonName) {
        console.error(`❌ Sale blocked: Vehicle ${vehicleId} has no salesperson linked`);
        toast({
          variant: "destructive",
          description: "Kan voertuig niet verkopen: er is geen verkoper gekoppeld"
        });
        return;
      }
      
      console.log(`✅ Vehicle ${vehicleId} validation passed - Customer: ${vehicle.customerId}, Salesperson: ${vehicle.salespersonId} (${vehicle.salespersonName})`);
    }
    
    // Track sales when changing FROM voorraad TO verkocht status (not vice versa)
    if ((status === 'verkocht_b2b' || status === 'verkocht_b2c') && vehicle && vehicle.salesStatus === 'voorraad' && vehicle.salespersonId && vehicle.salespersonName) {
      const salesType = status === 'verkocht_b2b' ? 'b2b' : 'b2c';
      console.log(`📊 Tracking sale for vehicle ${vehicleId}: ${vehicle.salespersonName} - ${salesType}`);
      
      trackSale({
        salespersonId: vehicle.salespersonId,
        salespersonName: vehicle.salespersonName,
        salesType,
        vehicleId
      });
      
      console.log(`✅ Sale tracking initiated for ${vehicle.salespersonName}`);
    } else if ((status === 'verkocht_b2b' || status === 'verkocht_b2c') && vehicle) {
      console.warn(`⚠️ Sale not tracked for vehicle ${vehicleId} - Status: ${vehicle.salesStatus}, Salesperson: ${vehicle.salespersonId}, Name: ${vehicle.salespersonName}`);
    }
    
    // When marking as sold, also set transportStatus to 'aangekomen' so it doesn't show in transport list
    if (vehicle && (status === 'verkocht_b2b' || status === 'verkocht_b2c')) {
      const updatedVehicle = {
        ...vehicle,
        salesStatus: status,
        transportStatus: 'aangekomen' as const
      };
      updateVehicleMutation.mutate(updatedVehicle);
      console.log(`✅ Vehicle ${vehicleId} updated with status ${status} and transportStatus set to aangekomen`);
    } else {
      changeVehicleStatusMutation.mutate({ vehicleId, status });
      console.log(`✅ Vehicle ${vehicleId} status change mutation initiated`);
    }
  };

  return {
    updateVehicleMutation,
    sendEmailMutation,
    updateSellingPriceMutation,
    updatePaymentStatusMutation,
    updatePaintStatusMutation,
    markAsDeliveredMutation,
    uploadFileMutation,
    changeVehicleStatusMutation,
    handleChangeStatus
  };
};
