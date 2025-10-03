
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Vehicle, PaymentStatus } from "@/types/inventory";
import { FileCategory } from "@/types/inventory";
import { useWeeklySalesTracking } from "@/hooks/useWeeklySalesTracking";
import { 
  updateVehicle, 
  sendEmail, 
  updateSellingPrice,
  updatePaymentStatus,
  uploadVehiclePhoto,
  updateSalesStatus,
  uploadVehicleFile,
  changeVehicleStatus
} from "@/services/inventoryService";

export const useB2BVehicleOperations = () => {
  const queryClient = useQueryClient();
  const { trackSale } = useWeeklySalesTracking();
  
  const updateVehicleMutation = useMutation({
    mutationFn: (vehicle: Vehicle) => updateVehicle(vehicle),
    onSuccess: () => {
      toast.success("Voertuig bijgewerkt");
      queryClient.invalidateQueries({ queryKey: ["b2bVehicles"] });
    },
    onError: (error) => {
      toast.error("Fout bij het bijwerken van het voertuig");
      console.error("Error updating vehicle:", error);
    }
  });
  
  const sendEmailMutation = useMutation({
    mutationFn: ({ type, vehicleId, contractOptions }: { type: string; vehicleId: string; contractOptions?: any }) => 
      sendEmail(type, [vehicleId], contractOptions),
    onSuccess: () => {
      toast.success("E-mail verzonden");
    },
    onError: (error) => {
      toast.error("Fout bij het verzenden van e-mail");
      console.error("Error sending email:", error);
    }
  });
  
  const updateSellingPriceMutation = useMutation({
    mutationFn: ({ vehicleId, price }: { vehicleId: string; price: number }) => 
      updateSellingPrice(vehicleId, price),
    onSuccess: () => {
      toast.success("Verkoopprijs bijgewerkt");
      queryClient.invalidateQueries({ queryKey: ["b2bVehicles"] });
    },
    onError: (error) => {
      toast.error("Fout bij het bijwerken van de verkoopprijs");
      console.error("Error updating selling price:", error);
    }
  });
  
  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ vehicleId, status }: { vehicleId: string; status: PaymentStatus }) => 
      updatePaymentStatus(vehicleId, status),
    onSuccess: () => {
      toast.success("Betaalstatus bijgewerkt");
      queryClient.invalidateQueries({ queryKey: ["b2bVehicles"] });
    },
    onError: (error) => {
      toast.error("Fout bij het bijwerken van de betaalstatus");
      console.error("Error updating payment status:", error);
    }
  });

  const markAsDeliveredMutation = useMutation({
    mutationFn: (vehicleId: string) => 
      updateSalesStatus(vehicleId, "afgeleverd"),
    onSuccess: () => {
      toast.success("Voertuig gemarkeerd als afgeleverd");
      queryClient.invalidateQueries({ queryKey: ["b2bVehicles"] });
    },
    onError: (error) => {
      toast.error("Fout bij het markeren van het voertuig als afgeleverd");
      console.error("Error marking vehicle as delivered:", error);
    }
  });
  
  const uploadFileMutation = useMutation({
    mutationFn: ({ file, category, vehicleId }: { file: File, category: FileCategory, vehicleId: string }) =>
      uploadVehicleFile(file, category, vehicleId),
    onSuccess: () => {
      toast.success("Document geüpload");
      queryClient.invalidateQueries({ queryKey: ["vehicleFiles"] });
    },
    onError: (error) => {
      toast.error("Fout bij het uploaden van het document");
      console.error("Error uploading file:", error);
    }
  });
  
  const handleUpdateVehicle = (updatedVehicle: Vehicle) => {
    updateVehicleMutation.mutate(updatedVehicle);
  };
  
  const handleSendEmail = (type: string, vehicleId: string, contractOptions?: any) => {
    sendEmailMutation.mutate({ type, vehicleId, contractOptions });
  };
  
  const handleUpdateSellingPrice = (vehicleId: string, price: number) => {
    updateSellingPriceMutation.mutate({ vehicleId, price });
  };
  
  const handleUpdatePaymentStatus = (vehicleId: string, status: PaymentStatus) => {
    updatePaymentStatusMutation.mutate({ vehicleId, status });
  };
  
  const handleMarkAsDelivered = (vehicleId: string) => {
    markAsDeliveredMutation.mutate(vehicleId);
  };

  const changeVehicleStatusMutation = useMutation({
    mutationFn: ({ vehicleId, status }: { vehicleId: string; status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad' }) => 
      changeVehicleStatus(vehicleId, status),
    onSuccess: (_, { vehicleId, status }) => {
      toast.success("Voertuig status bijgewerkt");
      queryClient.invalidateQueries({ queryKey: ["b2bVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["weeklySalesLeaderboard"] });
    },
    onError: (error) => {
      toast.error("Fout bij het bijwerken van de voertuig status");
      console.error("Error changing vehicle status:", error);
    }
  });

  const handleChangeStatus = async (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => {
    // Find the vehicle to get info for validation and tracking
    const currentVehicles = queryClient.getQueryData<Vehicle[]>(["b2bVehicles"]) || [];
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
        toast.error("Kan voertuig niet verkopen: er is geen klant gekoppeld");
        return;
      }
      if (!vehicle.salespersonId || !vehicle.salespersonName) {
        console.error(`❌ Sale blocked: Vehicle ${vehicleId} has no salesperson linked`);
        toast.error("Kan voertuig niet verkopen: er is geen verkoper gekoppeld");
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
    
    changeVehicleStatusMutation.mutate({ vehicleId, status });
    console.log(`✅ Vehicle ${vehicleId} status change mutation initiated`);
  };
  
  return {
    handleUpdateVehicle,
    handleSendEmail,
    handleUpdateSellingPrice,
    handleUpdatePaymentStatus,
    handleMarkAsDelivered,
    handleChangeStatus,
    uploadFileMutation
  };
};
