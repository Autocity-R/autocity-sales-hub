
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Vehicle, ImportStatus } from "@/types/inventory";

export const useChatbotCommands = (selectedVehicles: string[] = []) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Single vehicle update mutation
  const updateVehicleMutation = useMutation({
    mutationFn: (vehicle: Vehicle) => {
      // Mock update function - replace with actual API call
      return Promise.resolve(vehicle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({
        title: "Voertuig bijgewerkt",
        description: "De wijzigingen zijn succesvol opgeslagen."
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij bijwerken",
        description: "Er is iets misgegaan: " + error
      });
    }
  });
  
  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (data: { status: ImportStatus }) => {
      // Mock update function - replace with actual API call
      return Promise.resolve(selectedVehicles);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({
        title: "Voertuigen bijgewerkt",
        description: `${selectedVehicles.length} voertuigen zijn succesvol bijgewerkt.`
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij bulk-update",
        description: "Er is iets misgegaan: " + error
      });
    }
  });

  // Email sending mutation
  const sendEmailMutation = useMutation({
    mutationFn: (data: { type: string, vehicleIds: string[] }) => {
      // Mock email function - replace with actual API call
      const { type, vehicleIds } = data;
      
      // Simulate API call with 1 second delay
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, type, count: vehicleIds.length });
        }, 1000);
      });
    },
    onSuccess: (data: any) => {
      let title = "E-mail verzonden";
      let description = "De e-mail is succesvol verzonden.";
      
      // More specific messages based on email type
      if (data.type === "invoice") {
        title = "Factuur verzonden";
        description = `Factuur verzonden naar ${data.count} klant(en).`;
      } else if (data.type === "reminder") {
        title = "Herinnering verzonden";
        description = `Herinnering verzonden naar ${data.count} klant(en).`;
      }
      
      toast({
        title,
        description
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij versturen e-mail",
        description: "Er is iets misgegaan: " + error
      });
    }
  });
  
  return {
    updateVehicle: (vehicle: Vehicle) => updateVehicleMutation.mutate(vehicle),
    bulkUpdate: (status: ImportStatus) => bulkUpdateMutation.mutate({ status }),
    sendEmail: (type: string, vehicleIds: string[]) => 
      sendEmailMutation.mutate({ type, vehicleIds: vehicleIds || selectedVehicles }),
  };
};
