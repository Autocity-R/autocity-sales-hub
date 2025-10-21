
import React from "react";
import { Vehicle } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Trash2, Star, Check } from "lucide-react";
import { FileUploader } from "@/components/inventory/FileUploader";

interface PhotosTabProps {
  vehicle: Vehicle;
  onPhotoUpload: (file: File, isMain: boolean) => void;
  onRemovePhoto: (photoUrl: string) => void;
  onSetMainPhoto: (photoUrl: string) => void;
  readOnly?: boolean;
}

export const PhotosTab: React.FC<PhotosTabProps> = ({
  vehicle,
  onPhotoUpload,
  onRemovePhoto,
  onSetMainPhoto,
  readOnly = false
}) => {
  const [uploading, setUploading] = React.useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      await onPhotoUpload(file, !vehicle.mainPhotoUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!readOnly && (
        <div className="border rounded-md p-4 space-y-4">
          <h3 className="text-lg font-medium">Foto's toevoegen</h3>
          <FileUploader 
            onFileUpload={handleFileUpload} 
            acceptedFileTypes=".jpg,.jpeg,.png"
            isLoading={uploading}
          />
          <p className="text-sm text-muted-foreground">
            Upload foto's van het voertuig. De eerste foto wordt automatisch als hoofdfoto ingesteld.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Hoofdfoto</h3>
        {vehicle.mainPhotoUrl ? (
          <div className="relative rounded-md overflow-hidden border">
            <img 
              src={vehicle.mainPhotoUrl} 
              alt="Hoofdfoto" 
              className="w-full h-64 object-cover"
            />
            {!readOnly && (
              <div className="absolute top-2 right-2 flex space-x-2">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => onRemovePhoto(vehicle.mainPhotoUrl!)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="absolute top-2 left-2">
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-green-500 text-white hover:bg-green-600"
              >
                <Star className="h-4 w-4 mr-1" /> Hoofdfoto
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            Geen hoofdfoto ingesteld
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Alle foto's</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vehicle.photos.map((photoUrl, index) => (
            <div key={index} className="relative rounded-md overflow-hidden border">
              <img 
                src={photoUrl} 
                alt={`Foto ${index + 1}`}
                className="w-full h-48 object-cover"
              />
              {!readOnly && (
                <div className="absolute top-2 right-2 flex space-x-2">
                  {photoUrl !== vehicle.mainPhotoUrl && (
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => onSetMainPhoto(photoUrl)}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onRemovePhoto(photoUrl)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {photoUrl === vehicle.mainPhotoUrl && (
                <div className="absolute top-2 left-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="bg-green-500 text-white hover:bg-green-600"
                  >
                    <Check className="h-4 w-4 mr-1" /> Hoofdfoto
                  </Button>
                </div>
              )}
            </div>
          ))}

          {vehicle.photos.length === 0 && (
            <div className="col-span-3 rounded-md border p-8 text-center text-muted-foreground">
              Geen foto's toegevoegd
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
