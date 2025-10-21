
import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { B2BInventoryHeader } from "@/components/inventory/B2BInventoryHeader";
import { B2BInventoryContent } from "@/components/inventory/B2BInventoryContent";
import { ContractConfigDialog } from "@/components/inventory/ContractConfigDialog";
import { useB2BVehicles } from "@/hooks/useB2BVehicles";
import { useB2BVehicleSelection } from "@/hooks/useB2BVehicleSelection";
import { useB2BVehicleOperations } from "@/hooks/useB2BVehicleOperations";
import { useVehiclePhotos } from "@/hooks/useVehiclePhotos";
import { useVehicleFiles } from "@/hooks/useVehicleFiles";
import { FileCategory, VehicleFile, Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const InventoryB2B = () => {
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractVehicle, setContractVehicle] = useState<Vehicle | null>(null);
  const [contractType, setContractType] = useState<"b2b" | "b2c">("b2b");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Custom hooks for managing state and operations
  const { vehicles, isLoading, error, sortField, sortDirection, onSort } = useB2BVehicles();
  const { selectedVehicles, setSelectedVehicles, selectedVehicle, setSelectedVehicle, toggleSelectVehicle, toggleSelectAll } = useB2BVehicleSelection(vehicles);
  const { handleUpdateVehicle, handleSendEmail, handleUpdateSellingPrice, handleUpdatePaymentStatus, handleMarkAsDelivered, handleChangeStatus, uploadFileMutation } = useB2BVehicleOperations();
  const { vehicleFiles = [] } = useVehicleFiles(selectedVehicle);
  const { handleUploadPhoto, handleRemovePhoto, handleSetMainPhoto } = useVehiclePhotos(selectedVehicle, setSelectedVehicle);

  const handleFileUpload = (file: File, category: FileCategory) => {
    if (!selectedVehicle) return;
    uploadFileMutation.mutate({ file, category, vehicleId: selectedVehicle.id });
  };

  const handleOpenContractConfig = (vehicle: Vehicle, type: "b2b" | "b2c") => {
    setContractVehicle(vehicle);
    setContractType(type);
    setContractDialogOpen(true);
  };

  const handleSendContract = (options: ContractOptions) => {
    if (!contractVehicle) return;
    
    // Determine email type based on contract type
    const emailType = contractType === "b2b" ? "contract_b2b" : "contract_send";
    handleSendEmail(emailType, contractVehicle.id, options);
    
    setContractDialogOpen(false);
    setContractVehicle(null);
  };

  const handleBulkAction = async (action: string, value?: string) => {
    if (action === 'delete') {
      if (!confirm(`Weet u zeker dat u ${selectedVehicles.length} voertuig(en) wilt verwijderen? Dit verwijdert ook alle gerelateerde documenten en data.`)) {
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const vehicleId of selectedVehicles) {
        try {
          // 1. Haal alle files op voor dit voertuig
          const { data: files } = await supabase
            .from('vehicle_files')
            .select('*')
            .eq('vehicle_id', vehicleId);
          
          // 2. Verwijder alle files uit storage
          if (files && files.length > 0) {
            for (const file of files) {
              try {
                await supabase.storage
                  .from('vehicle-documents')
                  .remove([file.file_path]);
              } catch (err) {
                console.warn('Could not delete file from storage:', err);
              }
            }
          }
          
          // 3. Verwijder het voertuig (trigger ruimt rest op)
          const { error } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', vehicleId);
          
          if (error) {
            console.error('Error deleting vehicle:', vehicleId, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Exception deleting vehicle:', vehicleId, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Voertuigen verwijderd",
          description: `${successCount} voertuig(en) en alle gerelateerde data succesvol verwijderd`,
        });
      }

      if (errorCount > 0) {
        toast({
          variant: "destructive",
          title: "Fout bij verwijderen",
          description: `${errorCount} voertuig(en) konden niet worden verwijderd`,
        });
      }
    } else if (action === 'status' && value) {
      // Change status of selected vehicles
      console.log(`[BULK_ACTION] Updating ${selectedVehicles.length} vehicles to status: ${value}`);
      
      for (const vehicleId of selectedVehicles) {
        try {
          const { error } = await supabase
            .from('vehicles')
            .update({ status: value })
            .eq('id', vehicleId);
          
          if (error) {
            console.error('[BULK_ACTION] Error updating vehicle:', error);
            throw error;
          }
        } catch (error) {
          console.error('Error updating vehicle status:', error);
        }
      }
      toast({
        title: "Status bijgewerkt",
        description: `Status van ${selectedVehicles.length} voertuig(en) gewijzigd naar ${value}`,
      });
    }
    
    // Refresh ALL vehicle queries to ensure vehicles move between lists
    await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['b2bVehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['b2cVehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['onlineVehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['deliveredVehicles'] });
    
    // Clear selection
    setSelectedVehicles([]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <B2BInventoryHeader
          selectedVehicles={selectedVehicles}
          onBulkAction={handleBulkAction}
        />
        
        <B2BInventoryContent
          vehicles={vehicles}
          selectedVehicles={selectedVehicles}
          selectedVehicle={selectedVehicle}
          vehicleFiles={vehicleFiles}
          isLoading={isLoading}
          error={error}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={onSort}
          toggleSelectAll={toggleSelectAll}
          toggleSelectVehicle={toggleSelectVehicle}
          setSelectedVehicle={setSelectedVehicle}
          onSendEmail={handleSendEmail}
          onUpdateSellingPrice={handleUpdateSellingPrice}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
          onChangeStatus={handleChangeStatus}
          onMarkAsDelivered={handleMarkAsDelivered}
          onUpdateVehicle={handleUpdateVehicle}
          onPhotoUpload={handleUploadPhoto}
          onRemovePhoto={handleRemovePhoto}
          onSetMainPhoto={handleSetMainPhoto}
          onFileUpload={handleFileUpload}
          onOpenContractConfig={handleOpenContractConfig}
        />
      </div>

      {contractVehicle && (
        <ContractConfigDialog
          isOpen={contractDialogOpen}
          onClose={() => {
            setContractDialogOpen(false);
            setContractVehicle(null);
          }}
          vehicle={contractVehicle}
          contractType={contractType}
          onSendContract={handleSendContract}
        />
      )}
    </DashboardLayout>
  );
};

export default InventoryB2B;
