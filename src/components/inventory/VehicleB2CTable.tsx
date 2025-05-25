
import React from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Vehicle, PaymentStatus, PaintStatus } from "@/types/inventory";
import { VehicleB2CTableHeader } from "./b2c-table/VehicleB2CTableHeader";
import { VehicleB2CTableRow } from "./b2c-table/VehicleB2CTableRow";

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
  onMarkAsDelivered: (vehicleId: string) => void;
  handleChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
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
  isLoading,
  error,
  onSort,
  sortField,
  sortDirection
}) => {
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = React.useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string | null>(null);

  const handleDeliveryConfirm = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setDeliveryConfirmOpen(true);
  };

  const confirmDelivery = () => {
    if (selectedVehicleId) {
      onMarkAsDelivered(selectedVehicleId);
      setDeliveryConfirmOpen(false);
      setSelectedVehicleId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-10 w-full mb-4" />
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full mb-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Fout bij het laden van voertuigen</div>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table className="table-fixed w-full">
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
                <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
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
                  onDeliveryConfirm={handleDeliveryConfirm}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deliveryConfirmOpen} onOpenChange={setDeliveryConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voertuig afgeleverd markeren?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u dit voertuig als afgeleverd wilt markeren? 
              Het voertuig wordt verplaatst naar de 'Afgeleverd' sectie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelivery}>Ja, markeer als afgeleverd</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
