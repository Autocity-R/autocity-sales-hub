
import { useQuery } from "@tanstack/react-query";
import { Vehicle, VehicleFile } from "@/types/inventory";
import { fetchVehicleFiles } from "@/services/inventoryService";

export const useVehicleFiles = (selectedVehicle: Vehicle | null) => {
  const { data: vehicleFiles = [] } = useQuery({
    queryKey: ["vehicleFiles", selectedVehicle?.id],
    queryFn: () => selectedVehicle ? fetchVehicleFiles(selectedVehicle.id) : Promise.resolve([]),
    enabled: !!selectedVehicle
  });

  return { vehicleFiles };
};
