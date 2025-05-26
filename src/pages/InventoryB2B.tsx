
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

const InventoryB2B = () => {
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractVehicle, setContractVehicle] = useState<Vehicle | null>(null);
  const [contractType, setContractType] = useState<"b2b" | "b2c">("b2b");

  // Custom hooks for managing state and operations
  const { vehicles, isLoading, error, sortField, sortDirection, onSort } = useB2BVehicles();
  const { selectedVehicles, selectedVehicle, setSelectedVehicle, toggleSelectVehicle, toggleSelectAll } = useB2BVehicleSelection(vehicles);
  const { handleUpdateVehicle, handleSendEmail, handleUpdateSellingPrice, handleUpdatePaymentStatus, handleMarkAsDelivered, uploadFileMutation } = useB2BVehicleOperations();
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
    const emailType = contractType === "b2b" ? "contract_b2b_digital" : "contract_b2c_digital";
    handleSendEmail(emailType, contractVehicle.id);
    
    setContractDialogOpen(false);
    setContractVehicle(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <B2BInventoryHeader selectedVehicles={selectedVehicles} />
        
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
