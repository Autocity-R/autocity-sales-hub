import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { B2BInventoryHeader } from "@/components/inventory/B2BInventoryHeader";
import { B2BInventoryContent } from "@/components/inventory/B2BInventoryContent";
import { ContractConfigDialog } from "@/components/inventory/ContractConfigDialog";
import { InvoiceRequestDialog } from "@/components/inventory/InvoiceRequestDialog";
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
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceVehicle, setInvoiceVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Custom hooks for managing state and operations
  const { vehicles, isLoading, error, sortField, sortDirection, onSort } = useB2BVehicles();
  
  // Filter vehicles based on search term
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle =>
      `${vehicle.brand} ${vehicle.model} ${vehicle.licenseNumber} ${vehicle.vin}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);
  
  const { selectedVehicles, setSelectedVehicles, selectedVehicle, setSelectedVehicle, toggleSelectVehicle, toggleSelectAll } = useB2BVehicleSelection(filteredVehicles);
  const { handleUpdateVehicle, handleSendEmail, handleUpdateSellingPrice, handleUpdatePaymentStatus, handleMarkAsDelivered, handleChangeStatus, handleUpdateLocation, uploadFileMutation } = useB2BVehicleOperations();
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

  const handleInvoiceRequest = (vehicle: Vehicle) => {
    setInvoiceVehicle(vehicle);
    setInvoiceDialogOpen(true);
  };

  const handleInvoiceConfirm = (bpmIncluded: boolean) => {
    if (!invoiceVehicle) return;
    
    // Verstuur facturatie e-mail met BPM keuze
    handleSendEmail("invoice_request", invoiceVehicle.id, { bpmIncluded });
    
    setInvoiceDialogOpen(false);
    setInvoiceVehicle(null);
  };

  // Wrapper to handle both B2B (3 params) and general (6 params) email patterns
  const handleSendEmailWrapper = (
    type: string,
    recipientEmail?: string,
    recipientName?: string,
    subject?: string,
    vehicleId?: string,
    contractOptions?: any
  ) => {
    // Detect if it's B2B pattern (type + vehicleId) or general pattern (all 6 params)
    if (!recipientName && !subject && recipientEmail && !vehicleId) {
      // B2B pattern: (type, vehicleId, contractOptions)
      const actualVehicleId = recipientEmail; // Second param is vehicleId in B2B pattern
      handleSendEmail(type, actualVehicleId, contractOptions);
    } else {
      // General pattern from VehicleDetails: (type, recipientEmail, recipientName, subject, vehicleId, contractOptions)
      handleSendEmail(type, vehicleId || '', contractOptions);
    }
  };

  const handleSendContract = (options: ContractOptions) => {
    if (!contractVehicle) return;
    
    // Contracten versturen (B2B of B2C)
    const emailType = contractType === "b2b" ? "contract_b2b" : "contract_send";
    handleSendEmail(emailType, contractVehicle.id, options);
    
    setContractDialogOpen(false);
    setContractVehicle(null);
  };

  // Real-time subscription for B2B changes
  useEffect(() => {
    const channel = supabase
      .channel('vehicles-b2b-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        (payload) => {
          console.log('Vehicle changed (B2B):', payload);
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          queryClient.invalidateQueries({ queryKey: ['b2bVehicles'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleMoveBackToTransport = async (vehicleId: string) => {
    try {
      const { deliveredVehicleService } = await import("@/services/deliveredVehicleService");
      await deliveredVehicleService.moveVehicleBackToTransport(vehicleId);
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["b2bVehicles"] });
      
      toast({
        title: "Voertuig teruggeplaatst",
        description: "Het voertuig is teruggeplaatst naar het Transport menu",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er ging iets mis bij het terugplaatsen van het voertuig",
      });
    }
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

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Zoek voertuigen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {filteredVehicles.length} resultaten
            </Badge>
            {selectedVehicles.length > 0 && (
              <Badge variant="secondary">
                {selectedVehicles.length} geselecteerd
              </Badge>
            )}
          </div>
        </div>
        
        <B2BInventoryContent
          vehicles={filteredVehicles}
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
          onSendEmail={handleSendEmailWrapper}
          onUpdateSellingPrice={handleUpdateSellingPrice}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
          onUpdateLocation={handleUpdateLocation}
          onChangeStatus={handleChangeStatus}
          onMarkAsDelivered={handleMarkAsDelivered}
          onUpdateVehicle={handleUpdateVehicle}
          onPhotoUpload={handleUploadPhoto}
          onRemovePhoto={handleRemovePhoto}
          onSetMainPhoto={handleSetMainPhoto}
          onFileUpload={handleFileUpload}
          onOpenContractConfig={handleOpenContractConfig}
          onInvoiceRequest={handleInvoiceRequest}
          onMoveBackToTransport={handleMoveBackToTransport}
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

      <InvoiceRequestDialog
        isOpen={invoiceDialogOpen}
        onClose={() => {
          setInvoiceDialogOpen(false);
          setInvoiceVehicle(null);
        }}
        onConfirm={handleInvoiceConfirm}
        vehicle={invoiceVehicle}
      />
    </DashboardLayout>
  );
};

export default InventoryB2B;
