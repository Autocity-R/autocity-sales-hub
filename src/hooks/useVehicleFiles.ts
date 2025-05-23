
import { useQuery } from "@tanstack/react-query";
import { Vehicle, VehicleFile } from "@/types/inventory";
import { fetchVehicleFiles } from "@/services/inventoryService";

export const useVehicleFiles = (vehicle: Vehicle | null) => {
  const { data: vehicleFiles = [], isLoading, error } = useQuery({
    queryKey: ["vehicleFiles", vehicle?.id],
    queryFn: () => vehicle ? fetchVehicleFiles(vehicle.id) : Promise.resolve([]),
    enabled: !!vehicle,
  });

  // Ensure we always return a valid array
  const safeVehicleFiles: VehicleFile[] = Array.isArray(vehicleFiles) ? vehicleFiles : [];

  return {
    vehicleFiles: safeVehicleFiles,
    isLoading,
    error,
  };
};
