
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
import { VehicleMobileCard } from "./VehicleMobileCard";
import { useIsMobile } from "@/hooks/use-mobile";

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
  onOpenContractConfig?: (vehicle: Vehicle, contractType: "b2b" | "b2c") => void;
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
  isLoading,
  error,
  onSort,
  sortField,
  sortDirection
}) => {
  const isMobile = useIsMobile();
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
                onDeliveryConfirm={handleDeliveryConfirm}
                onOpenContractConfig={onOpenContractConfig}
              />
            ))
          )}
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
  }

  // Desktop Table View
  return (
    <>
      <div className="w-full overflow-x-auto">
        <Table className="w-full max-w-none min-w-[1400px] 2xl:min-w-[1600px] 3xl:min-w-[1900px] 4xl:min-w-[2200px]">
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
                  onDeliveryConfirm={handleDeliveryConfirm}
                  onOpenContractConfig={onOpenContractConfig}
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
