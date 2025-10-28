
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Vehicle, PaymentStatus, PaintStatus } from "@/types/inventory";
import { VehicleB2CTableHeader } from "./b2c-table/VehicleB2CTableHeader";
import { VehicleB2CTableRow } from "./b2c-table/VehicleB2CTableRow";
import { VehicleMobileCard } from "./VehicleMobileCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { DeliveryConfirmationDialog, DeliveryData } from "./DeliveryConfirmationDialog";

interface VehicleB2CTableProps {
  vehicles: Vehicle[];
  selectedVehicles: string[];
  toggleSelectAll: (checked: boolean) => void;
  toggleSelectVehicle: (id: string, checked: boolean) => void;
  handleSelectVehicle: (vehicle: Vehicle) => void;
  handleSendEmail: (type: string, vehicleId: string) => void;
  handleUpdateSellingPrice: (vehicleId: string, price: number) => void;
  handleUpdatePaymentStatus: (vehicleId: string, status: PaymentStatus) => void;
  handleUpdatePaintStatus: (vehicleId: string, status: PaintStatus) => void;
  onMarkAsDelivered: (
    vehicleId: string,
    warrantyPackage: string,
    warrantyPackageName: string,
    deliveryDate: Date,
    warrantyPackagePrice?: number,
    deliveryNotes?: string
  ) => void;
  handleChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  onOpenContractConfig?: (vehicle: Vehicle, contractType: "b2b" | "b2c", isInvoice?: boolean) => void;
  onMoveBackToTransport?: (vehicleId: string) => void;
  isLoading: boolean;
  error: unknown;
  onSort: (field: string) => void;
  sortField: string | null;
  sortDirection: "asc" | "desc";
}

export const VehicleB2CTable: React.FC<VehicleB2CTableProps> = ({
  vehicles,
  selectedVehicles,
  toggleSelectAll,
  toggleSelectVehicle,
  handleSelectVehicle,
  handleSendEmail,
  onMarkAsDelivered,
  handleChangeStatus,
  onOpenContractConfig,
  onMoveBackToTransport,
  isLoading,
  error,
  onSort,
  sortField,
  sortDirection
}) => {
  const isMobile = useIsMobile();
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [selectedVehicleForDelivery, setSelectedVehicleForDelivery] = useState<Vehicle | null>(null);

  const handleDeliveryClick = (vehicle: Vehicle) => {
    setSelectedVehicleForDelivery(vehicle);
    setDeliveryDialogOpen(true);
  };

  const handleDeliveryConfirm = (deliveryData: DeliveryData) => {
    if (selectedVehicleForDelivery) {
      onMarkAsDelivered(
        selectedVehicleForDelivery.id,
        deliveryData.warrantyPackage,
        deliveryData.warrantyPackageName,
        deliveryData.deliveryDate,
        deliveryData.warrantyPackagePrice,
        deliveryData.deliveryNotes
      );
      setDeliveryDialogOpen(false);
      setSelectedVehicleForDelivery(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-10 w-full mb-4" />
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className={isMobile ? "h-32 w-full mb-3" : "h-16 w-full mb-2"} />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Fout bij het laden van voertuigen</div>;
  }

  // Mobile Card View
  if (isMobile) {
    return (
      <>
        <div className="space-y-3 p-3">
          {vehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen voertuigen gevonden
            </div>
          ) : (
            vehicles.map((vehicle) => (
              <VehicleMobileCard
                key={vehicle.id}
                vehicle={vehicle}
                onSelectVehicle={handleSelectVehicle}
                onSendEmail={handleSendEmail}
                onChangeStatus={handleChangeStatus}
                onDeliveryConfirm={() => handleDeliveryClick(vehicle)}
                onOpenContractConfig={onOpenContractConfig}
              />
            ))
          )}
        </div>

        <DeliveryConfirmationDialog
          open={deliveryDialogOpen}
          onOpenChange={setDeliveryDialogOpen}
          onConfirm={handleDeliveryConfirm}
          vehicleBrand={selectedVehicleForDelivery?.brand}
          vehicleModel={selectedVehicleForDelivery?.model}
          isCarDealer={false}
        />
      </>
    );
  }

  // Desktop Table View
  return (
    <>
      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-[1400px]">
          <VehicleB2CTableHeader
            selectedVehicles={selectedVehicles}
            vehiclesLength={vehicles.length}
            toggleSelectAll={toggleSelectAll}
            onSort={onSort}
            sortField={sortField}
            sortDirection={sortDirection}
          />
          <TableBody>
            {vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                  Geen voertuigen gevonden
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((vehicle) => (
                <VehicleB2CTableRow
                  key={vehicle.id}
                  vehicle={vehicle}
                  selectedVehicles={selectedVehicles}
                  toggleSelectVehicle={toggleSelectVehicle}
                  handleSelectVehicle={handleSelectVehicle}
                  handleSendEmail={handleSendEmail}
                  handleChangeStatus={handleChangeStatus}
                  onDeliveryConfirm={() => handleDeliveryClick(vehicle)}
                  onOpenContractConfig={onOpenContractConfig}
                  onMoveBackToTransport={onMoveBackToTransport}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DeliveryConfirmationDialog
        open={deliveryDialogOpen}
        onOpenChange={setDeliveryDialogOpen}
        onConfirm={handleDeliveryConfirm}
        vehicleBrand={selectedVehicleForDelivery?.brand}
        vehicleModel={selectedVehicleForDelivery?.model}
        isCarDealer={false}
      />
    </>
  );
};
