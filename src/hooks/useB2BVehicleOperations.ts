
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Vehicle, PaymentStatus, LocationStatus } from "@/types/inventory";
import { FileCategory } from "@/types/inventory";
import { supabase } from "@/integrations/supabase/client";
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
    mutationFn: async ({ vehicleId, status }: { vehicleId: string; status: PaymentStatus }) => {
      // ✅ Update SALES payment status voor B2B (verkoop betaling)
      const { data: currentVehicle, error: fetchError } = await supabase
        .from('vehicles')
        .select('details')
        .eq('id', vehicleId)
        .single();

      if (fetchError) throw fetchError;

      const updatedDetails = {
        ...(currentVehicle?.details as Record<string, any> || {}),
        sales_payment_status: status  // ← Specifiek voor VERKOOP betaling
      };

      const { data, error } = await supabase
        .from('vehicles')
        .update({ details: updatedDetails })
        .eq('id', vehicleId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Betaalstatus klant bijgewerkt");
      queryClient.invalidateQueries({ queryKey: ["b2bVehicles"] });
    },
    onError: (error) => {
      toast.error("Fout bij het bijwerken van de betaalstatus");
      console.error("Error updating payment status:", error);
    }
  });

  const markAsDeliveredMutation = useMutation({
    mutationFn: async ({ 
      vehicleId, 
      warrantyPackage, 
      warrantyPackageName, 
      deliveryDate, 
      warrantyPackagePrice, 
      deliveryNotes 
    }: { 
      vehicleId: string; 
      warrantyPackage: string; 
      warrantyPackageName: string; 
      deliveryDate: Date; 
      warrantyPackagePrice?: number; 
      deliveryNotes?: string; 
    }) => {
      const { markVehicleAsDelivered } = await import("@/services/inventoryService");
      return markVehicleAsDelivered(
        vehicleId, 
        warrantyPackage, 
        warrantyPackageName, 
        deliveryDate, 
        warrantyPackagePrice, 
        deliveryNotes
      );
    },
    onSuccess: () => {
      toast.success("Voertuig afgeleverd met garantiegegevens");
      queryClient.invalidateQueries({ queryKey: ["b2bVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["deliveredVehicles"] });
    },
    onError: (error) => {
      toast.error("Fout bij het afleveren van het voertuig");
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
  
  const handleMarkAsDelivered = (
    vehicleId: string,
    warrantyPackage: string,
    warrantyPackageName: string,
    deliveryDate: Date,
    warrantyPackagePrice?: number,
    deliveryNotes?: string
  ) => {
    markAsDeliveredMutation.mutate({
      vehicleId,
      warrantyPackage,
      warrantyPackageName,
      deliveryDate,
      warrantyPackagePrice,
      deliveryNotes
    });
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

  const updateLocationMutation = useMutation({
    mutationFn: async ({ vehicleId, location }: { vehicleId: string; location: string }) => {
      console.log(`🔄 Starting location update for vehicle ${vehicleId} to ${location}`);
      const { supabaseInventoryService } = require("@/services/supabaseInventoryService");
      // Gebruik updateVehicle met alleen location parameter om de auto-sync logica te respecteren
      return supabaseInventoryService.updateVehicle({ 
        id: vehicleId, 
        location: location as LocationStatus 
      } as any);
    },
    onMutate: async ({ vehicleId, location }) => {
      // Cancel lopende queries
      await queryClient.cancelQueries({ queryKey: ["b2bVehicles"] });
      
      // Snapshot van vorige state
      const previousVehicles = queryClient.getQueryData<Vehicle[]>(["b2bVehicles"]);
      
      // Optimistic update: direct de UI updaten
      queryClient.setQueryData<Vehicle[]>(["b2bVehicles"], (old = []) =>
        old.map(v => v.id === vehicleId ? { ...v, location: location as LocationStatus } : v)
      );
      
      console.log(`✨ Optimistic update: vehicle ${vehicleId} location set to ${location}`);
      
      return { previousVehicles };
    },
    onSuccess: (_, { vehicleId, location }) => {
      console.log(`✅ Location update successful for vehicle ${vehicleId} to ${location}`);
      toast.success("Locatie bijgewerkt");
      
      // Invalideer query om definitieve data op te halen
      queryClient.invalidateQueries({ queryKey: ["b2bVehicles"] });
    },
    onError: (error, { vehicleId, location }, context) => {
      console.error(`❌ Location update failed for vehicle ${vehicleId} to ${location}:`, error);
      
      // Rollback bij fout
      if (context?.previousVehicles) {
        queryClient.setQueryData(["b2bVehicles"], context.previousVehicles);
      }
      
      toast.error("Fout bij het bijwerken van de locatie");
    },
    onSettled: () => {
      // Forceer refresh na afloop (zowel bij success als error)
      queryClient.invalidateQueries({ queryKey: ["b2bVehicles"] });
    }
  });

  const handleUpdateLocation = (vehicleId: string, location: string) => {
    console.log(`📍 Handling location update for vehicle ${vehicleId} to ${location}`);
    updateLocationMutation.mutate({ vehicleId, location });
  };

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
    handleUpdateLocation,
    uploadFileMutation
  };
};
