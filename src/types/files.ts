
export type FileCategory = "damage" | "cmr" | "pickup";

export interface VehicleFile {
  id: string;
  name: string;
  url: string;
  category: FileCategory;
  vehicleId: string;
  createdAt: string;
  size?: number;
  type?: string;
}
