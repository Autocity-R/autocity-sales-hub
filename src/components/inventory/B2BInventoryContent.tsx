
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
  onSendEmail: (
    type: string,
    recipientEmail?: string,
    recipientName?: string,
    subject?: string,
    vehicleId?: string,
    contractOptions?: any
  ) => void;
  onUpdateSellingPrice: (vehicleId: string, price: number) => void;
  onUpdatePaymentStatus: (vehicleId: string, status: PaymentStatus) => void;
  onUpdateLocation?: (vehicleId: string, location: string) => void;
  onChangeStatus: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  onMarkAsDelivered: (
    vehicleId: string,
    warrantyPackage: string,
    warrantyPackageName: string,
    deliveryDate: Date,
    warrantyPackagePrice?: number,
    deliveryNotes?: string
  ) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onPhotoUpload: (file: File, isMain: boolean) => void;
  onRemovePhoto: (photoUrl: string) => void;
  onSetMainPhoto: (photoUrl: string) => void;
  onFileUpload: (file: File, category: FileCategory) => void;
  onOpenContractConfig: (vehicle: Vehicle, type: "b2b" | "b2c") => void;
  onInvoiceRequest?: (vehicle: Vehicle) => void;
  onMoveBackToTransport?: (vehicleId: string) => void;
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
  onUpdateLocation,
  onChangeStatus,
  onMarkAsDelivered,
  onUpdateVehicle,
  onPhotoUpload,
  onRemovePhoto,
  onSetMainPhoto,
  onFileUpload,
  onOpenContractConfig,
  onInvoiceRequest,
  onMoveBackToTransport
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
          handleChangeStatus={onChangeStatus}
          onMarkAsDelivered={onMarkAsDelivered}
          onOpenContractConfig={onOpenContractConfig}
          onInvoiceRequest={onInvoiceRequest}
          onMoveBackToTransport={onMoveBackToTransport}
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
