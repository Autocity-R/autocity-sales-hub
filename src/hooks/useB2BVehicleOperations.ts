
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
    mutationFn: ({ type, vehicleId }: { type: string; vehicleId: string }) => 
      sendEmail(type, [vehicleId]),
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
  
  const handleSendEmail = (type: string, vehicleId: string) => {
    sendEmailMutation.mutate({ type, vehicleId });
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
      queryClient.invalidateQueries({ queryKey: ["weeklySalesLeaderboard"] });
    },
    onError: (error) => {
      toast.error("Fout bij het bijwerken van de voertuig status");
      console.error("Error changing vehicle status:", error);
    }
  });

  const handleChangeStatus = async (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => {
    // Find the vehicle to get salesperson info for tracking
    const currentVehicles = queryClient.getQueryData<Vehicle[]>(["b2bVehicles"]) || [];
    const vehicle = currentVehicles.find(v => v.id === vehicleId);
    
    // Track sales before status change
    if ((status === 'verkocht_b2b' || status === 'verkocht_b2c') && vehicle && vehicle.salespersonId && vehicle.salespersonName) {
      const salesType = status === 'verkocht_b2b' ? 'b2b' : 'b2c';
      trackSale({
        salespersonId: vehicle.salespersonId,
        salespersonName: vehicle.salespersonName,
        salesType
      });
    }
    
    changeVehicleStatusMutation.mutate({ vehicleId, status });
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
