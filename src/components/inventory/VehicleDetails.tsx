import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { X } from "lucide-react";
import { Vehicle, FileCategory, VehicleFile } from "@/types/inventory";
import { ContractOptions } from "@/types/email";
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
import { ContactsTab } from "@/components/inventory/detail-tabs/ContactsTab";
import { EmailHistoryTab } from "@/components/inventory/detail-tabs/EmailHistoryTab";
import { ChecklistTab } from "@/components/inventory/detail-tabs/ChecklistTab";
import { ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVehicleFiles } from "@/hooks/useVehicleFiles";
import { useDebounce } from "@/hooks/useDebounce";
import { useRoleAccess } from "@/hooks/useRoleAccess";

interface VehicleDetailsProps {
  vehicle: Vehicle;
  onClose: () => void;
  onUpdate: (vehicle: Vehicle) => void;
  onAutoSave?: (vehicle: Vehicle) => void;
  onSendEmail: (type: string, recipientEmail?: string, recipientName?: string, subject?: string, vehicleId?: string, contractOptions?: ContractOptions) => void;
  onPhotoUpload: (file: File, isMain: boolean) => void;
  onRemovePhoto: (photoUrl: string) => void;
  onSetMainPhoto: (photoUrl: string) => void;
  onFileUpload?: (file: File, category: FileCategory) => void;
  onFileDelete?: (fileId: string, filePath: string) => void;
  files?: VehicleFile[];
  defaultTab?: string;
}

export const VehicleDetails: React.FC<VehicleDetailsProps> = ({
  vehicle,
  onClose,
  onUpdate,
  onAutoSave,
  onSendEmail,
  onPhotoUpload,
  onRemovePhoto,
  onSetMainPhoto,
  onFileUpload,
  onFileDelete,
  files = [],
  defaultTab = 'details',
}) => {
  const [editedVehicle, setEditedVehicle] = useState<Vehicle>(vehicle);
  const initialVehicleRef = useRef<Vehicle>(vehicle);
  const hasUserChangesRef = useRef(false);
  
  // Role-based access
  const { hasPriceAccess, isOperationalUser, canChecklistToggle, isAftersalesManager, canManageChecklists } = useRoleAccess();
  
  // Voor algemene voertuig editing (details tab, prijzen, etc.) - aftersales_manager krijgt read-only voor details
  const isReadOnly = isOperationalUser() || isAftersalesManager();
  
  // Operationeel personeel mag alleen checklist items afvinken (niet toevoegen/verwijderen)
  const canOnlyToggleChecklist = isOperationalUser() && canChecklistToggle();
  
  // Aftersales manager krijgt volledige checklist toegang (toevoegen, afvinken, taken toewijzen)
  const checklistReadOnly = !canManageChecklists();
  const checklistCanToggleOnly = isOperationalUser() && canChecklistToggle();
  
  // Always use the hook to fetch files for this vehicle
  const { vehicleFiles: hookVehicleFiles } = useVehicleFiles(vehicle);
  const filesData = hookVehicleFiles;
  
  // Debounce the edited vehicle to trigger auto-save
  const debouncedVehicle = useDebounce(editedVehicle, 1500); // 1.5 second delay
  
  // Reset edited vehicle when vehicle prop changes (but keep user changes)
  useEffect(() => {
    if (!hasUserChangesRef.current) {
      setEditedVehicle(vehicle);
      initialVehicleRef.current = vehicle;
    }
  }, [vehicle.id]); // Only reset when vehicle ID changes
  
  // Auto-save when user makes changes (debounced)
  useEffect(() => {
    if (onAutoSave && hasUserChangesRef.current && debouncedVehicle.id === initialVehicleRef.current.id) {
      // Check if there are actual changes from initial state
      const hasChanges = JSON.stringify(debouncedVehicle) !== JSON.stringify(initialVehicleRef.current);
      
      // Validatie: voorkom auto-save als verplichte prijzen ontbreken voor verkochte voertuigen
      const isSold = debouncedVehicle.salesStatus === 'verkocht_b2b' || debouncedVehicle.salesStatus === 'verkocht_b2c';
      const hasSellingPrice = debouncedVehicle.sellingPrice && debouncedVehicle.sellingPrice > 0;
      const hasPurchasePrice = (debouncedVehicle.purchasePrice && debouncedVehicle.purchasePrice > 0) || 
                               (debouncedVehicle.details?.purchasePrice && debouncedVehicle.details.purchasePrice > 0);
      
      if (isSold && (!hasSellingPrice || !hasPurchasePrice)) {
        console.warn('⚠️ Auto-save geblokkeerd: verkocht voertuig mist verplichte prijzen', {
          vehicleId: debouncedVehicle.id,
          hasSellingPrice,
          hasPurchasePrice
        });
        return;
      }
      
      if (hasChanges) {
        console.log('Auto-saving vehicle changes...');
        onAutoSave(debouncedVehicle);
        // Update initial reference to prevent re-saving the same changes
        initialVehicleRef.current = debouncedVehicle;
      }
    }
  }, [debouncedVehicle, onAutoSave]); // Removed 'vehicle' dependency to prevent infinite loops
  
  const handleChange = (field: keyof Vehicle, value: any) => {
    hasUserChangesRef.current = true; // Mark that user has made changes
    
    setEditedVehicle(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleDamageChange = (field: keyof Vehicle["damage"], value: any) => {
    hasUserChangesRef.current = true; // Mark that user has made changes
    setEditedVehicle(prev => ({
      ...prev,
      damage: {
        ...prev.damage,
        [field]: value
      }
    }));
  };

  const handleReminderUpdate = (type: 'payment_reminder' | 'papers_reminder', enabled: boolean) => {
    hasUserChangesRef.current = true;
    const currentSettings = (editedVehicle as any).emailReminderSettings || {};
    const updatedSettings = {
      ...currentSettings,
      [`${type}_enabled`]: enabled
    };
    
    setEditedVehicle(prev => ({
      ...prev,
      emailReminderSettings: updatedSettings
    } as any));
  };

  const handleSave = () => {
    // Validatie: voorkom opslaan als verplichte prijzen ontbreken voor verkochte voertuigen
    const isSold = editedVehicle.salesStatus === 'verkocht_b2b' || editedVehicle.salesStatus === 'verkocht_b2c';
    const hasSellingPrice = editedVehicle.sellingPrice && editedVehicle.sellingPrice > 0;
    const hasPurchasePrice = (editedVehicle.purchasePrice && editedVehicle.purchasePrice > 0) || 
                             (editedVehicle.details?.purchasePrice && editedVehicle.details.purchasePrice > 0);
    
    if (isSold && (!hasSellingPrice || !hasPurchasePrice)) {
      console.error('❌ Opslaan geblokkeerd: verkocht voertuig mist verplichte prijzen');
      return;
    }
    
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
            <Tabs defaultValue={defaultTab} className="h-full flex flex-col">
              <div className="px-6 py-2 bg-background sticky top-0 z-[5]">
                <TabsList className={cn(
                  "w-full grid",
                  vehicle.salesStatus === 'verkocht_b2c' ? "grid-cols-7" : "grid-cols-6"
                )}>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="contacts">Contacten</TabsTrigger>
                  <TabsTrigger value="photos">Foto's</TabsTrigger>
                  <TabsTrigger value="files">Documenten</TabsTrigger>
                  {vehicle.salesStatus === 'verkocht_b2c' && (
                    <TabsTrigger value="checklist">
                      <ClipboardCheck className="h-4 w-4 mr-1" />
                      Checklist
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="emails">Emails</TabsTrigger>
                  <TabsTrigger value="history">Verzonden</TabsTrigger>
                </TabsList>
                <Separator className="mt-2" />
              </div>
              
              <ScrollArea className="flex-1 px-6 py-4">
                <TabsContent value="details" className="h-full mt-0 p-0">
                  <DetailsTab 
                    editedVehicle={editedVehicle}
                    handleChange={handleChange}
                    handleDamageChange={handleDamageChange}
                    readOnly={isReadOnly}
                    showPrices={hasPriceAccess()}
                  />
                </TabsContent>
                
                <TabsContent value="contacts" className="h-full mt-0 p-0">
                  <ContactsTab 
                    vehicle={editedVehicle}
                    onUpdate={setEditedVehicle}
                  />
                </TabsContent>
                
                <TabsContent value="photos" className="h-full mt-0 p-0">
                  <PhotosTab 
                    vehicle={vehicle}
                    onPhotoUpload={onPhotoUpload}
                    onRemovePhoto={onRemovePhoto}
                    onSetMainPhoto={onSetMainPhoto}
                    readOnly={isReadOnly}
                  />
                </TabsContent>
                
                <TabsContent value="files" className="h-full mt-0 p-0">
                  <FilesTab 
                    files={filesData}
                    onFileUpload={onFileUpload || (() => {})}
                    onFileDelete={onFileDelete || (() => {})}
                    onSendEmail={(type) => onSendEmail(type, undefined, undefined, undefined, vehicle.id)}
                    readOnly={isReadOnly}
                  />
                </TabsContent>
                
                {vehicle.salesStatus === 'verkocht_b2c' && (
                  <TabsContent value="checklist" className="h-full mt-0 p-0">
                    <ChecklistTab 
                      vehicle={editedVehicle}
                      onUpdate={(updatedVehicle) => {
                        hasUserChangesRef.current = true;
                        setEditedVehicle(updatedVehicle);
                      }}
                      onAutoSave={onAutoSave}
                      readOnly={checklistReadOnly}
                      canToggleOnly={checklistCanToggleOnly}
                    />
                  </TabsContent>
                )}
                
                <TabsContent value="emails" className="h-full mt-0 p-0">
                  {vehicle.salesStatus === "verkocht_b2c" ? (
                    <B2CEmailsTab 
                      vehicle={editedVehicle}
                      onSendEmail={(type, recipientEmail, recipientName, subject, contractOptions) => 
                        onSendEmail(type, recipientEmail, recipientName, subject, vehicle.id, contractOptions)
                      }
                      onUpdateReminder={handleReminderUpdate}
                    />
                  ) : (
                    <EmailsTab 
                      vehicle={editedVehicle}
                      onSendEmail={(type, contractOptions) => onSendEmail(type, undefined, undefined, undefined, vehicle.id, contractOptions)}
                      onUpdateReminder={handleReminderUpdate}
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="history" className="h-full mt-0 p-0">
                  <EmailHistoryTab vehicleId={vehicle.id} />
                </TabsContent>
                
                {/* Add sufficient bottom padding to ensure content isn't hidden under the footer */}
                <div className="h-20" />
              </ScrollArea>
            </Tabs>
          </div>
          
          {/* Sticky footer */}
          <div className="sticky bottom-0 left-0 right-0 flex justify-end gap-2 p-4 border-t bg-background z-10">
            <Button type="button" variant="secondary" onClick={onClose}>
              {isReadOnly && !canManageChecklists() ? 'Sluiten' : 'Annuleren'}
            </Button>
            {/* Show save button for users who can edit vehicles OR manage checklists */}
            {(!isReadOnly || canManageChecklists()) && (() => {
              const isSold = editedVehicle.salesStatus === 'verkocht_b2b' || editedVehicle.salesStatus === 'verkocht_b2c';
              const hasSellingPrice = editedVehicle.sellingPrice && editedVehicle.sellingPrice > 0;
              const hasPurchasePrice = (editedVehicle.purchasePrice && editedVehicle.purchasePrice > 0) || 
                                       (editedVehicle.details?.purchasePrice && editedVehicle.details.purchasePrice > 0);
              // Aftersales manager hoeft geen prijzen te valideren - ze kunnen die niet aanpassen
              const shouldValidatePrices = !isReadOnly;
              const missingPrices = shouldValidatePrices && isSold && (!hasSellingPrice || !hasPurchasePrice);
              
              return (
                <Button 
                  type="submit" 
                  onClick={handleSave}
                  disabled={missingPrices}
                >
                  Opslaan
                </Button>
              );
            })()}
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
