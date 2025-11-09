import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Vehicle, VehicleFile } from "@/types/inventory";
import { fetchVehicleFiles } from "@/services/inventoryService";

export const useVehicleFiles = (vehicle: Vehicle | null) => {
  const queryClient = useQueryClient();
  
  const { data: vehicleFiles = [], isLoading, error, refetch } = useQuery({
    queryKey: ["vehicleFiles", vehicle?.id],
    queryFn: () => vehicle ? fetchVehicleFiles(vehicle.id) : Promise.resolve([]),
    enabled: !!vehicle,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Ensure we always return a valid array
  const safeVehicleFiles: VehicleFile[] = Array.isArray(vehicleFiles) ? vehicleFiles : [];

  // Helper function to manually refresh files (can be called after contract save)
  const refreshFiles = () => {
    if (vehicle?.id) {
      queryClient.invalidateQueries({ queryKey: ["vehicleFiles", vehicle.id] });
    }
  };

  return {
    vehicleFiles: safeVehicleFiles,
    isLoading,
    error,
    refetch,
    refreshFiles,
  };
};
