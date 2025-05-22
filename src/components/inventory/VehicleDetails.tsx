
import React, { useState } from "react";
import { 
  Car, Save, X, Mail
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Vehicle } from "@/types/inventory";
import { VehicleFile, FileCategory, VehicleDetailsProps } from "@/types/files";

// Import our new tab components
import { DetailsTab } from "@/components/inventory/detail-tabs/DetailsTab";
import { FilesTab } from "@/components/inventory/detail-tabs/FilesTab";
import { ContactsTab } from "@/components/inventory/detail-tabs/ContactsTab";
import { EmailsTab } from "@/components/inventory/detail-tabs/EmailsTab";
import { VehiclePhotoTab } from "@/components/inventory/VehiclePhotoTab";

export const VehicleDetails: React.FC<VehicleDetailsProps> = ({
  vehicle,
  onClose,
  onUpdate,
  onSendEmail,
  onPhotoUpload,
  onRemovePhoto,
  onSetMainPhoto
}) => {
  const [editedVehicle, setEditedVehicle] = useState<Vehicle>({...vehicle});
  const [activeTab, setActiveTab] = useState<string>("details");
  
  // Mock files for demonstration
  const [files, setFiles] = useState<VehicleFile[]>([
    {
      id: "1",
      name: "damage-photo.jpg",
      size: 1240000,
      url: "#",
      category: "damage",
      uploadDate: new Date(2023, 4, 15)
    },
    {
      id: "2",
      name: "pickup-document.pdf",
      size: 450000,
      url: "#",
      category: "pickup",
      uploadDate: new Date(2023, 5, 10)
    }
  ]);
  
  const handleChange = (field: keyof Vehicle, value: any) => {
    setEditedVehicle({ ...editedVehicle, [field]: value });
  };

  const handleDamageChange = (field: keyof Vehicle["damage"], value: any) => {
    setEditedVehicle({
      ...editedVehicle,
      damage: { ...editedVehicle.damage, [field]: value }
    });
  };
  
  const handleSave = () => {
    onUpdate(editedVehicle);
  };
  
  const handleFileUpload = (file: File, category: FileCategory) => {
    // In a real implementation, this would upload the file to a server
    // For now we'll just mock it
    const newFile: VehicleFile = {
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      category,
      uploadDate: new Date()
    };
    
    setFiles([...files, newFile]);
  };
  
  const handleSendEmail = (type: string) => {
    if (onSendEmail) {
      onSendEmail(type, editedVehicle.id);
    }
  };

  const handlePhotoUpload = async (file: File, isMain: boolean) => {
    if (onPhotoUpload) {
      await onPhotoUpload(file, isMain);
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    if (onRemovePhoto) {
      await onRemovePhoto(photoUrl);
    }
  };

  const handleSetMainPhoto = async (photoUrl: string) => {
    if (onSetMainPhoto) {
      await onSetMainPhoto(photoUrl);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {editedVehicle.licenseNumber} - {editedVehicle.brand} {editedVehicle.model}
          </DialogTitle>
          <DialogDescription>
            Bekijk en bewerk alle details van dit voertuig.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="photos">Foto's</TabsTrigger>
            <TabsTrigger value="files">Bestanden</TabsTrigger>
            <TabsTrigger value="contacts">Contacten</TabsTrigger>
            <TabsTrigger value="emails">E-mails</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <DetailsTab 
              editedVehicle={editedVehicle} 
              handleChange={handleChange}
              handleDamageChange={handleDamageChange}
            />
          </TabsContent>
          
          <TabsContent value="photos" className="space-y-4 mt-4">
            <VehiclePhotoTab 
              vehicle={editedVehicle}
              onAddPhoto={handlePhotoUpload}
              onRemovePhoto={handleRemovePhoto}
              onSetMainPhoto={handleSetMainPhoto}
            />
          </TabsContent>
          
          <TabsContent value="files" className="space-y-4 mt-4">
            <FilesTab 
              files={files}
              onFileUpload={handleFileUpload}
            />
          </TabsContent>
          
          <TabsContent value="contacts" className="space-y-4 mt-4">
            <ContactsTab />
          </TabsContent>
          
          <TabsContent value="emails" className="space-y-4 mt-4">
            <EmailsTab 
              onSendEmail={handleSendEmail} 
              vehicle={editedVehicle}
            />
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Annuleren
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
