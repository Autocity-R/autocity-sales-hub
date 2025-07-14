
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Vehicle } from "@/types/inventory";
import { updateVehicle, uploadVehiclePhoto } from "@/services/inventoryService";

export const useVehiclePhotos = (selectedVehicle: Vehicle | null, onVehicleUpdate: (vehicle: Vehicle) => void) => {
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
  
  const handleUploadPhoto = async (file: File, isMain: boolean) => {
    if (!selectedVehicle) return;
    
    try {
      const photoUrl = await uploadVehiclePhoto(selectedVehicle.id, file, isMain);
      
      // Update the vehicle with the new photo
      const updatedPhotos = [...(selectedVehicle.photos || [])];
      if (!updatedPhotos.includes(photoUrl)) {
        updatedPhotos.push(photoUrl);
      }
      
      const updatedVehicle = {
        ...selectedVehicle,
        photos: updatedPhotos,
        mainPhotoUrl: isMain ? photoUrl : selectedVehicle.mainPhotoUrl
      };
      
      updateVehicleMutation.mutate(updatedVehicle);
      onVehicleUpdate(updatedVehicle);
    } catch (error) {
      toast.error("Fout bij het uploaden van de foto");
      console.error("Error uploading photo:", error);
    }
  };
  
  const handleRemovePhoto = async (photoUrl: string) => {
    if (!selectedVehicle) return;
    
    try {
      const updatedPhotos = selectedVehicle.photos.filter(url => url !== photoUrl);
      let updatedMainPhoto = selectedVehicle.mainPhotoUrl;
      
      if (selectedVehicle.mainPhotoUrl === photoUrl) {
        updatedMainPhoto = updatedPhotos.length > 0 ? updatedPhotos[0] : null;
      }
      
      const updatedVehicle = {
        ...selectedVehicle,
        photos: updatedPhotos,
        mainPhotoUrl: updatedMainPhoto
      };
      
      updateVehicleMutation.mutate(updatedVehicle);
      onVehicleUpdate(updatedVehicle);
    } catch (error) {
      toast.error("Fout bij het verwijderen van de foto");
      console.error("Error removing photo:", error);
    }
  };
  
  const handleSetMainPhoto = async (photoUrl: string) => {
    if (!selectedVehicle) return;
    
    try {
      const updatedVehicle = {
        ...selectedVehicle,
        mainPhotoUrl: photoUrl
      };
      
      updateVehicleMutation.mutate(updatedVehicle);
      onVehicleUpdate(updatedVehicle);
    } catch (error) {
      toast.error("Fout bij het instellen van de hoofdfoto");
      console.error("Error setting main photo:", error);
    }
  };
  
  return {
    handleUploadPhoto,
    handleRemovePhoto,
    handleSetMainPhoto
  };
};
