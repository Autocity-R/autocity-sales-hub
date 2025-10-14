
import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VehicleForm } from "./VehicleForm";
import { Vehicle } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";
import { createVehicle } from "@/services/inventoryService";
import { useQueryClient } from "@tanstack/react-query";

interface AddVehicleDialogProps {
  onVehicleAdded?: (vehicle: Vehicle) => void;
}

export const AddVehicleDialog: React.FC<AddVehicleDialogProps> = ({ onVehicleAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (vehicleData: Omit<Vehicle, "id">) => {
    try {
      const newVehicle = await createVehicle(vehicleData);
      
      // Invalidate all relevant queries to update dashboard and lists
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["transport-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["onlineVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["b2bVehicles"] });
      
      toast({
        description: "Voertuig succesvol toegevoegd"
      });

      if (onVehicleAdded) {
        onVehicleAdded(newVehicle);
      }

      setIsOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Fout bij het toevoegen van het voertuig"
      });
      console.error("Error creating vehicle:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nieuw voertuig
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuw voertuig toevoegen</DialogTitle>
        </DialogHeader>
        <VehicleForm onSubmit={handleSubmit} />
      </DialogContent>
    </Dialog>
  );
};
