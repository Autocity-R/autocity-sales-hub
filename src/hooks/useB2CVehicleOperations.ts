
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
    mutationFn: ({ type, vehicleIds }: { type: string; vehicleIds: string[] }) => 
      sendEmail(type, vehicleIds),
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
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het bijwerken van de voertuigstatus"
      });
      console.error("Error updating vehicle status:", error);
    }
  });

  return {
    updateVehicleMutation,
    sendEmailMutation,
    updateSellingPriceMutation,
    updatePaymentStatusMutation,
    updatePaintStatusMutation,
    markAsDeliveredMutation,
    uploadFileMutation,
    changeVehicleStatusMutation
  };
};
