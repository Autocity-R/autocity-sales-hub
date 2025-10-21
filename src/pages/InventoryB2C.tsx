
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Mail, Plus } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { VehicleB2CTable } from "@/components/inventory/VehicleB2CTable";
import { VehicleDetails } from "@/components/inventory/VehicleDetails";
import { ContractConfigDialog } from "@/components/inventory/ContractConfigDialog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { fetchB2CVehicles } from "@/services/inventoryService";
import { useVehicleFiles } from "@/hooks/useVehicleFiles";
import { useB2CVehicleHandlers } from "@/hooks/useB2CVehicleHandlers";
import { InventoryBulkActions } from "@/components/inventory/InventoryBulkActions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";
import { useToast } from "@/hooks/use-toast";

const InventoryB2C = () => {
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractVehicle, setContractVehicle] = useState<Vehicle | null>(null);
  const [contractType, setContractType] = useState<"b2b" | "b2c">("b2c");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch B2C sold vehicles only
  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ["b2cVehicles"],
    queryFn: fetchB2CVehicles
  });

  // Use the custom hook for all handlers and state
  const {
    selectedVehicles,
    selectedVehicle,
    sortField,
    sortDirection,
    setSelectedVehicle,
    handleUploadPhoto,
    handleRemovePhoto,
    handleSetMainPhoto,
    handleUpdateVehicle,
    handleSendEmail,
    handleUpdateSellingPrice,
    handleUpdatePaymentStatus,
    handleUpdatePaintStatus,
    handleMarkAsDelivered,
    handleSort,
    toggleSelectVehicle,
    toggleSelectAll,
    handleUploadFile,
    handleChangeStatus
  } = useB2CVehicleHandlers();

  // Properly fetch files for selected vehicle using our hook
  const { vehicleFiles } = useVehicleFiles(selectedVehicle);

  const handleOpenContractConfig = (vehicle: Vehicle, type: "b2b" | "b2c") => {
    setContractVehicle(vehicle);
    setContractType(type);
    setContractDialogOpen(true);
  };

  const handleSendContract = (options: ContractOptions) => {
    if (!contractVehicle) return;
    
    // Determine email type based on contract type
    const emailType = contractType === "b2b" ? "contract_b2b_digital" : "contract_b2c_digital";
    handleSendEmail(emailType, contractVehicle.id);
    
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
  };
  
  // Sort vehicles based on sort field and direction
  const sortedVehicles = [...vehicles].sort((a, b) => {
    if (!sortField) return 0;
    
    // Handle nested fields
    let aValue: any = a;
    let bValue: any = b;
    
    const fields = sortField.split(".");
    for (const field of fields) {
      aValue = aValue?.[field];
      bValue = bValue?.[field];
    }
    
    if (aValue === undefined || bValue === undefined) return 0;
    
    // For numbers
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }
    
    // For strings
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }
    
    // For booleans
    if (typeof aValue === "boolean" && typeof bValue === "boolean") {
      return sortDirection === "asc" 
        ? (aValue === bValue ? 0 : aValue ? 1 : -1)
        : (aValue === bValue ? 0 : bValue ? 1 : -1);
    }
    
    return 0;
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader 
          title="Verkocht B2C" 
          description="Beheer uw verkochte voertuigen aan particuliere klanten"
        >
          <InventoryBulkActions 
            selectedVehicles={selectedVehicles}
            onBulkAction={handleBulkAction}
          />
        </PageHeader>
        
        <div className="bg-white rounded-md shadow">
          <VehicleB2CTable 
            vehicles={sortedVehicles}
            selectedVehicles={selectedVehicles}
            toggleSelectAll={(checked) => toggleSelectAll(checked, vehicles)}
            toggleSelectVehicle={toggleSelectVehicle}
            handleSelectVehicle={setSelectedVehicle}
            handleSendEmail={handleSendEmail}
            handleUpdateSellingPrice={handleUpdateSellingPrice}
            handleUpdatePaymentStatus={handleUpdatePaymentStatus}
            handleUpdatePaintStatus={handleUpdatePaintStatus}
            onMarkAsDelivered={handleMarkAsDelivered}
            handleChangeStatus={handleChangeStatus}
            onOpenContractConfig={handleOpenContractConfig}
            isLoading={isLoading}
            error={error}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        </div>
      </div>
      
      {selectedVehicle && (
        <VehicleDetails
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onUpdate={handleUpdateVehicle}
          onSendEmail={handleSendEmail}
          onPhotoUpload={handleUploadPhoto}
          onRemovePhoto={handleRemovePhoto}
          onSetMainPhoto={handleSetMainPhoto}
          onFileUpload={handleUploadFile}
          files={vehicleFiles}
        />
      )}

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

export default InventoryB2C;
