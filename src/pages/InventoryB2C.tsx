
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
import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";

const InventoryB2C = () => {
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractVehicle, setContractVehicle] = useState<Vehicle | null>(null);
  const [contractType, setContractType] = useState<"b2b" | "b2c">("b2c");

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
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" disabled={selectedVehicles.length === 0}>
              <FileText className="h-4 w-4 mr-2" />
              Export selectie
            </Button>
            <Button variant="outline" size="sm" disabled={selectedVehicles.length === 0}>
              <Mail className="h-4 w-4 mr-2" />
              E-mail sturen
            </Button>
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nieuw voertuig
            </Button>
          </div>
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
