import React, { useState, useEffect } from "react";
import { FileText, Mail, Plus, Search, Filter } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { VehicleB2CTable } from "@/components/inventory/VehicleB2CTable";
import { VehicleDetails } from "@/components/inventory/VehicleDetails";
import { ContractConfigDialog } from "@/components/inventory/ContractConfigDialog";
import { InvoiceRequestDialog } from "@/components/inventory/InvoiceRequestDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useVehicleFiles } from "@/hooks/useVehicleFiles";
import { useB2CVehicleHandlers } from "@/hooks/useB2CVehicleHandlers";
import { useB2CVehicles } from "@/hooks/useB2CVehicles";
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
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceVehicle, setInvoiceVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Use optimized B2C vehicles hook with filtering and sorting
  const {
    vehicles,
    isLoading,
    error
  } = useB2CVehicles({
    searchTerm
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

  const handleInvoiceRequest = (vehicle: Vehicle) => {
    setInvoiceVehicle(vehicle);
    setInvoiceDialogOpen(true);
  };

  const handleInvoiceConfirm = (bpmIncluded: boolean, notes?: string) => {
    if (!invoiceVehicle) return;
    
    // Verstuur facturatie e-mail met BPM keuze en eventuele notities
    handleSendEmail("invoice_request", undefined, undefined, undefined, invoiceVehicle.id, { 
      bpmIncluded,
      invoiceNotes: notes 
    });
    
    setInvoiceDialogOpen(false);
    setInvoiceVehicle(null);
  };

  const handleSendContract = (options: ContractOptions) => {
    if (!contractVehicle) return;
    
    // Contracten versturen (B2B of B2C)
    const emailType = contractType === "b2b" ? "contract_b2b_digital" : "contract_b2c_digital";
    handleSendEmail(emailType, undefined, undefined, undefined, contractVehicle.id, options);
    
    setContractDialogOpen(false);
    setContractVehicle(null);
  };

  // Optimized real-time subscription for B2C changes only
  useEffect(() => {
    const channel = supabase
      .channel('vehicles-b2c-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: 'status=eq.verkocht_b2c' // Only B2C vehicles
        },
        (payload) => {
          console.log('B2C Vehicle changed:', payload);
          
          // Optimized: Only invalidate B2C queries
          queryClient.invalidateQueries({ queryKey: ['b2cVehicles'] });
          
          // If we have specific vehicle details open, invalidate that too
          if (selectedVehicle) {
            queryClient.invalidateQueries({ queryKey: ['vehicleFiles', selectedVehicle.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, selectedVehicle]);

  const handleMoveBackToTransport = async (vehicleId: string) => {
    try {
      const { deliveredVehicleService } = await import("@/services/deliveredVehicleService");
      await deliveredVehicleService.moveVehicleBackToTransport(vehicleId);
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
      
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
    
    // Only invalidate relevant queries (not all)
    await queryClient.invalidateQueries({ queryKey: ['b2cVehicles'] });
  };

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
              {vehicles.length} resultaten
            </Badge>
            {selectedVehicles.length > 0 && (
              <Badge variant="secondary">
                {selectedVehicles.length} geselecteerd
              </Badge>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-md shadow">
          <VehicleB2CTable 
            vehicles={vehicles}
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
            onInvoiceRequest={handleInvoiceRequest}
            onMoveBackToTransport={handleMoveBackToTransport}
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

export default InventoryB2C;
