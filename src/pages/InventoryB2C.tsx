import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Mail, Plus, Search, Filter } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { VehicleB2CTable } from "@/components/inventory/VehicleB2CTable";
import { VehicleDetails } from "@/components/inventory/VehicleDetails";
import { ContractConfigDialog } from "@/components/inventory/ContractConfigDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [isInvoiceRequest, setIsInvoiceRequest] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  const handleOpenContractConfig = (vehicle: Vehicle, type: "b2b" | "b2c", isInvoice: boolean = false) => {
    setContractVehicle(vehicle);
    setContractType(type);
    setIsInvoiceRequest(isInvoice);
    setContractDialogOpen(true);
  };

  const handleSendContract = (options: ContractOptions) => {
    if (!contractVehicle) return;
    
    if (isInvoiceRequest) {
      // Voor invoice request: stuur email met BPM info
      // handleSendEmail signature: (type, recipientEmail?, recipientName?, subject?, vehicleId?, contractOptions?)
      handleSendEmail("invoice_request", undefined, undefined, undefined, contractVehicle.id, options);
    } else {
      // Bestaande logica voor contracten
      const emailType = contractType === "b2b" ? "contract_b2b_digital" : "contract_b2c_digital";
      handleSendEmail(emailType, undefined, undefined, undefined, contractVehicle.id, options);
    }
    
    setContractDialogOpen(false);
    setContractVehicle(null);
    setIsInvoiceRequest(false);
  };

  // Real-time subscription for B2C changes
  useEffect(() => {
    const channel = supabase
      .channel('vehicles-b2c-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        (payload) => {
          console.log('Vehicle changed (B2C):', payload);
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          queryClient.invalidateQueries({ queryKey: ['b2cVehicles'] });
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
    
    // Refresh ALL vehicle queries to ensure vehicles move between lists
    await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['b2bVehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['b2cVehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['onlineVehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['deliveredVehicles'] });
  };
  
  // Filter and sort vehicles based on search term and sort configuration
  const filteredAndSortedVehicles = useMemo(() => {
    // First filter
    const filtered = vehicles.filter(vehicle =>
      `${vehicle.brand} ${vehicle.model} ${vehicle.licenseNumber} ${vehicle.vin}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    
    // Then sort
    return [...filtered].sort((a, b) => {
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
  }, [vehicles, searchTerm, sortField, sortDirection]);

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
              {filteredAndSortedVehicles.length} resultaten
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
            vehicles={filteredAndSortedVehicles}
            selectedVehicles={selectedVehicles}
            toggleSelectAll={(checked) => toggleSelectAll(checked, filteredAndSortedVehicles)}
            toggleSelectVehicle={toggleSelectVehicle}
            handleSelectVehicle={setSelectedVehicle}
            handleSendEmail={handleSendEmail}
            handleUpdateSellingPrice={handleUpdateSellingPrice}
            handleUpdatePaymentStatus={handleUpdatePaymentStatus}
            handleUpdatePaintStatus={handleUpdatePaintStatus}
            onMarkAsDelivered={handleMarkAsDelivered}
            handleChangeStatus={handleChangeStatus}
            onOpenContractConfig={handleOpenContractConfig}
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
            setIsInvoiceRequest(false);
          }}
          vehicle={contractVehicle}
          contractType={contractType}
          onSendContract={handleSendContract}
          isInvoiceRequest={isInvoiceRequest}
        />
      )}
    </DashboardLayout>
  );
};

export default InventoryB2C;
