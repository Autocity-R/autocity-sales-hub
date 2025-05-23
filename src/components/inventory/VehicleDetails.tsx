
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
import { VehicleFile, FileCategory } from "@/types/inventory";

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
      <DialogContent className="max-w-[90%] sm:max-w-[75%] lg:max-w-[66%] xl:max-w-[50%] h-[90vh] p-0 flex flex-col">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Sticky header */}
          <DialogHeader className="sticky top-0 z-10 bg-background p-6 pb-2 border-b">
            <DialogTitle>
              {vehicle.brand} {vehicle.model}
            </DialogTitle>
            <DialogDescription>
              Details van voertuig bekijken en bewerken.
            </DialogDescription>
          </DialogHeader>
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="details" className="h-full flex flex-col">
              <div className="px-6 py-2 bg-background sticky top-0 z-[5]">
                <TabsList className="w-full">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="photos">Foto's</TabsTrigger>
                  <TabsTrigger value="files">Documenten</TabsTrigger>
                  <TabsTrigger value="emails">Emails</TabsTrigger>
                </TabsList>
                <Separator className="mt-2" />
              </div>
              
              <ScrollArea className="flex-1 px-6 py-4">
                <TabsContent value="details" className="h-full mt-0 p-0">
                  <DetailsTab 
                    editedVehicle={editedVehicle}
                    handleChange={handleChange}
                    handleDamageChange={handleDamageChange}
                  />
                </TabsContent>
                
                <TabsContent value="photos" className="h-full mt-0 p-0">
                  <PhotosTab 
                    vehicle={vehicle}
                    onPhotoUpload={onPhotoUpload}
                    onRemovePhoto={onRemovePhoto}
                    onSetMainPhoto={onSetMainPhoto}
                  />
                </TabsContent>
                
                <TabsContent value="files" className="h-full mt-0 p-0">
                  <FilesTab 
                    files={files}
                    onFileUpload={onFileUpload || (() => {})}
                  />
                </TabsContent>
                
                <TabsContent value="emails" className="h-full mt-0 p-0">
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
                
                {/* Add sufficient bottom padding to ensure content isn't hidden under the footer */}
                <div className="h-20" />
              </ScrollArea>
            </Tabs>
          </div>
          
          {/* Sticky footer */}
          <div className="sticky bottom-0 left-0 right-0 flex justify-end gap-2 p-4 border-t bg-background z-10">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" onClick={handleSave}>
              Opslaan
            </Button>
          </div>
        </div>

        {/* Close button */}
        <Button
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 rounded-sm"
          variant="ghost"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Sluiten</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
};
