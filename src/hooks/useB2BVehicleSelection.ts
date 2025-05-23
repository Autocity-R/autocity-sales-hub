
import { useState } from "react";
import { Vehicle } from "@/types/inventory";

export const useB2BVehicleSelection = (vehicles: Vehicle[]) => {
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  const toggleSelectVehicle = (vehicleId: string, checked: boolean) => {
    setSelectedVehicles(prev => 
      checked 
        ? [...prev, vehicleId]
        : prev.filter(id => id !== vehicleId)
    );
  };
  
  const toggleSelectAll = (checked: boolean) => {
    setSelectedVehicles(checked ? vehicles.map(v => v.id) : []);
  };
  
  return {
    selectedVehicles,
    selectedVehicle,
    setSelectedVehicle,
    toggleSelectVehicle,
    toggleSelectAll
  };
};
