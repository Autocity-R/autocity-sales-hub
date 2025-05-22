
import React, { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { X } from "lucide-react";
import { Vehicle } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailsTab } from "@/components/inventory/detail-tabs/DetailsTab";
import { EmailsTab } from "@/components/inventory/detail-tabs/EmailsTab";
import { B2CEmailsTab } from "@/components/inventory/detail-tabs/B2CEmailsTab";
import { PhotosTab } from "@/components/inventory/detail-tabs/PhotosTab";
import { FilesTab } from "@/components/inventory/detail-tabs/FilesTab";
import { VehicleFile, FileCategory } from "@/types/files";

interface VehicleDetailsProps {
  vehicle: Vehicle;
  onClose: () => void;
  onUpdate: (vehicle: Vehicle) => void;
  onSendEmail: (type: string, vehicleId: string) => void;
  onPhotoUpload: (file: File, isMain: boolean) => void;
  onRemovePhoto: (photoUrl: string) => void;
  onSetMainPhoto: (photoUrl: string) => void;
  onFileUpload?: (file: File, category: FileCategory) => void;
  files?: VehicleFile[];
}

export const VehicleDetails: React.FC<VehicleDetailsProps> = ({
  vehicle,
  onClose,
  onUpdate,
  onSendEmail,
  onPhotoUpload,
  onRemovePhoto,
  onSetMainPhoto,
  onFileUpload,
  files = []
}) => {
  const [editedVehicle, setEditedVehicle] = useState<Vehicle>(vehicle);
  
  const handleChange = (field: keyof Vehicle, value: any) => {
    setEditedVehicle(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleDamageChange = (field: keyof Vehicle["damage"], value: any) => {
    setEditedVehicle(prev => ({
      ...prev,
      damage: {
        ...prev.damage,
        [field]: value
      }
    }));
  };
  
  const handleSave = () => {
    onUpdate(editedVehicle);
  };
  
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "d MMMM yyyy", { locale: nl });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-[75%] lg:max-w-[66%] xl:max-w-[50%] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {vehicle.brand} {vehicle.model}
          </DialogTitle>
          <DialogDescription>
            Details van voertuig bekijken en bewerken.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(90vh-200px)]">
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList className="sticky top-0 bg-background z-10">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="photos">Foto's</TabsTrigger>
              <TabsTrigger value="files">Documenten</TabsTrigger>
              <TabsTrigger value="emails">Emails</TabsTrigger>
            </TabsList>
            <Separator />
            
            <TabsContent value="details" className="space-y-4">
              <DetailsTab 
                editedVehicle={editedVehicle}
                handleChange={handleChange}
                handleDamageChange={handleDamageChange}
              />
            </TabsContent>
            
            <TabsContent value="photos">
              <PhotosTab 
                vehicle={vehicle}
                onPhotoUpload={onPhotoUpload}
                onRemovePhoto={onRemovePhoto}
                onSetMainPhoto={onSetMainPhoto}
              />
            </TabsContent>
            
            <TabsContent value="files">
              <FilesTab 
                files={files}
                onFileUpload={onFileUpload || (() => {})}
              />
            </TabsContent>
            
            <TabsContent value="emails">
              {vehicle.salesStatus === "verkocht_b2c" ? (
                <B2CEmailsTab 
                  vehicle={vehicle}
                  onSendEmail={(type) => onSendEmail(type, vehicle.id)}
                />
              ) : (
                <EmailsTab 
                  vehicle={vehicle}
                  onSendEmail={(type) => onSendEmail(type, vehicle.id)}
                />
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
        
        <div className="flex justify-end space-x-2 mt-4 sticky bottom-0 bg-background pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" onClick={handleSave}>
            Opslaan
          </Button>
        </div>
        
        <Button
          size="sm"
          className="absolute top-2 right-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Sluiten</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
};
