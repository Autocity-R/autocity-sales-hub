import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Vehicle, ImportStatus } from "@/types/inventory";
import { updateVehicle, bulkUpdateVehicles, sendEmail } from "@/services/inventoryService";

export const useChatbotCommands = (vehicles: Vehicle[], selectedVehicles: string[]) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update vehicle mutation
  const updateMutation = useMutation({
    mutationFn: updateVehicle,
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

  // Bulk update vehicles mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, updates }: { ids: string[], updates: Partial<Vehicle> }) => 
      bulkUpdateVehicles(ids, updates),
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
  const emailMutation = useMutation({
    mutationFn: ({ type, vehicleIds }: { type: string, vehicleIds: string[] }) => 
      sendEmail(type, vehicleIds),
    onSuccess: (_, variables) => {
      let title, description;
      
      switch (variables.type) {
        case "transport_pickup":
          title = "Transport pickup document verstuurd";
          description = "De pickup documenten zijn succesvol naar de transporteur verstuurd.";
          break;
        case "cmr_supplier":
          title = "CMR naar leverancier verstuurd";
          description = "De CMR documenten zijn succesvol naar de leverancier verstuurd.";
          break;
        case "reminder_papers":
          title = "Herinnering verstuurd";
          description = "De herinneringsmail voor de papieren is succesvol verstuurd.";
          break;
        default:
          title = "E-mail verstuurd";
          description = "De e-mail is succesvol verstuurd.";
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

  const handleChatbotCommand = (command: string) => {
    // Example: "Markeer voertuig HNZ-60-N als 'transport geregeld'"
    if (command.includes("Markeer voertuig") && command.includes("als 'transport geregeld'")) {
      const licenseNumber = command.split("Markeer voertuig ")[1].split(" als")[0];
      
      const vehicle = vehicles.find(v => v.licenseNumber === licenseNumber);
      if (vehicle) {
        const updatedVehicle = {
          ...vehicle,
          importStatus: "transport_geregeld" as ImportStatus
        };
        updateMutation.mutate(updatedVehicle);
        
        return {
          success: true,
          message: `Voertuig ${licenseNumber} gemarkeerd als 'transport geregeld'`
        };
      }
      return { 
        success: false, 
        message: `Voertuig ${licenseNumber} niet gevonden` 
      };
    }
    
    // Example: "Voeg notitie toe aan voertuig ABC-123: klant gebeld"
    if (command.includes("Voeg notitie toe aan voertuig")) {
      const parts = command.split("Voeg notitie toe aan voertuig ");
      if (parts.length > 1) {
        const restParts = parts[1].split(": ");
        if (restParts.length > 1) {
          const licenseNumber = restParts[0];
          const note = restParts[1];
          
          const vehicle = vehicles.find(v => v.licenseNumber === licenseNumber);
          if (vehicle) {
            const updatedVehicle = {
              ...vehicle,
              notes: vehicle.notes + (vehicle.notes ? "\n" : "") + note
            };
            updateMutation.mutate(updatedVehicle);
            
            return {
              success: true,
              message: `Notitie toegevoegd aan voertuig ${licenseNumber}`
            };
          }
          return { 
            success: false, 
            message: `Voertuig ${licenseNumber} niet gevonden` 
          };
        }
      }
      return { 
        success: false, 
        message: "Onjuiste opdrachtnotatie. Probeer: 'Voeg notitie toe aan voertuig XXX-00-X: jouw notitie'" 
      };
    }

    // Handle bulk update via chatbot
    if (command.includes("Markeer alle geselecteerde voertuigen als")) {
      if (selectedVehicles.length === 0) {
        return {
          success: false,
          message: "Geen voertuigen geselecteerd"
        };
      }
      
      if (command.includes("'transport geregeld'")) {
        bulkUpdateMutation.mutate({
          ids: selectedVehicles,
          updates: { importStatus: "transport_geregeld" }
        });
        return {
          success: true,
          message: `${selectedVehicles.length} voertuigen gemarkeerd als 'transport geregeld'`
        };
      }
      
      if (command.includes("'aangekomen'")) {
        bulkUpdateMutation.mutate({
          ids: selectedVehicles,
          updates: { importStatus: "aangekomen", arrived: true }
        });
        return {
          success: true,
          message: `${selectedVehicles.length} voertuigen gemarkeerd als 'aangekomen'`
        };
      }
      
      if (command.includes("'gereed'")) {
        bulkUpdateMutation.mutate({
          ids: selectedVehicles,
          updates: { workshopStatus: "gereed" }
        });
        return {
          success: true,
          message: `${selectedVehicles.length} voertuigen gemarkeerd als 'gereed'`
        };
      }
    }

    // Handle email sending via chatbot
    if (command.includes("Stuur transport pickup document naar")) {
      const licenseNumber = command.split("Stuur transport pickup document naar ")[1].trim();
      const vehicle = vehicles.find(v => v.licenseNumber === licenseNumber);
      
      if (vehicle) {
        emailMutation.mutate({
          type: "transport_pickup",
          vehicleIds: [vehicle.id]
        });
        return {
          success: true,
          message: `Transport pickup document verstuurd voor voertuig ${licenseNumber}`
        };
      }
      return {
        success: false,
        message: `Voertuig ${licenseNumber} niet gevonden`
      };
    }

    // Default response for unhandled commands
    return { 
      success: false, 
      message: "Ik begrijp deze opdracht niet. Probeer een andere formulering." 
    };
  };

  return { handleChatbotCommand };
};
