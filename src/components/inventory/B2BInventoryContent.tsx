
import React from "react";
import { Vehicle, PaymentStatus, VehicleFile, FileCategory } from "@/types/inventory";
import { VehicleB2BTable } from "@/components/inventory/VehicleB2BTable";
import { VehicleDetails } from "@/components/inventory/VehicleDetails";

interface B2BInventoryContentProps {
  vehicles: Vehicle[];
  selectedVehicles: string[];
  selectedVehicle: Vehicle | null;
  vehicleFiles: VehicleFile[];
  isLoading: boolean;
  error: unknown;
  sortField: string | null;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
  toggleSelectAll: (checked: boolean) => void;
  toggleSelectVehicle: (vehicleId: string, checked: boolean) => void;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  onSendEmail: (type: string, vehicleId: string) => void;
  onUpdateSellingPrice: (vehicleId: string, price: number) => void;
  onUpdatePaymentStatus: (vehicleId: string, status: PaymentStatus) => void;
  onMarkAsDelivered: (vehicleId: string) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onPhotoUpload: (file: File, isMain: boolean) => void;
  onRemovePhoto: (photoUrl: string) => void;
  onSetMainPhoto: (photoUrl: string) => void;
  onFileUpload: (file: File, category: FileCategory) => void;
  onOpenContractConfig: (vehicle: Vehicle, type: "b2b" | "b2c") => void;
}

export const B2BInventoryContent = ({
  vehicles,
  selectedVehicles,
  selectedVehicle,
  vehicleFiles,
  isLoading,
  error,
  sortField,
  sortDirection,
  onSort,
  toggleSelectAll,
  toggleSelectVehicle,
  setSelectedVehicle,
  onSendEmail,
  onUpdateSellingPrice,
  onUpdatePaymentStatus,
  onMarkAsDelivered,
  onUpdateVehicle,
  onPhotoUpload,
  onRemovePhoto,
  onSetMainPhoto,
  onFileUpload,
  onOpenContractConfig
}: B2BInventoryContentProps) => {
  return (
    <>
      <div className="bg-white rounded-md shadow">
        <VehicleB2BTable 
          vehicles={vehicles}
          selectedVehicles={selectedVehicles}
          toggleSelectAll={toggleSelectAll}
          toggleSelectVehicle={toggleSelectVehicle}
          handleSelectVehicle={setSelectedVehicle}
          handleSendEmail={onSendEmail}
          handleUpdateSellingPrice={onUpdateSellingPrice}
          handleUpdatePaymentStatus={onUpdatePaymentStatus}
          onMarkAsDelivered={onMarkAsDelivered}
          onOpenContractConfig={onOpenContractConfig}
          isLoading={isLoading}
          error={error}
          onSort={onSort}
          sortField={sortField}
          sortDirection={sortDirection}
        />
      </div>
      
      {selectedVehicle && (
        <VehicleDetails
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onUpdate={onUpdateVehicle}
          onSendEmail={onSendEmail}
          onPhotoUpload={onPhotoUpload}
          onRemovePhoto={onRemovePhoto}
          onSetMainPhoto={onSetMainPhoto}
          onFileUpload={onFileUpload}
          files={vehicleFiles || []} // Ensure we pass an empty array if vehicleFiles is undefined
        />
      )}
    </>
  );
};
