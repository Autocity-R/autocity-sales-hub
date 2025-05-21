
import { Vehicle } from "@/types/inventory";

export type FileCategory = "damage" | "pickup" | "cmr" | "other";

export interface VehicleFile {
  id: string;
  name: string;
  size: number;
  url: string;
  category: FileCategory;
  uploadDate: Date;
}

export interface VehicleDetailsProps {
  vehicle: Vehicle;
  onClose: () => void;
  onUpdate: (vehicle: Vehicle) => void;
  onSendEmail?: (type: string, vehicleId: string) => void;
  onPhotoUpload?: (file: File, isMain: boolean) => Promise<void>;
  onRemovePhoto?: (photoUrl: string) => Promise<void>;
  onSetMainPhoto?: (photoUrl: string) => Promise<void>;
}
