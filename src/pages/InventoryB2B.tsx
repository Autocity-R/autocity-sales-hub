
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
      // Delete selected vehicles
      for (const vehicleId of selectedVehicles) {
        try {
          await supabase.from('vehicles').delete().eq('id', vehicleId);
        } catch (error) {
          console.error('Error deleting vehicle:', error);
        }
      }
      toast({
        title: "Voertuigen verwijderd",
        description: `${selectedVehicles.length} voertuig(en) succesvol verwijderd`,
      });
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
