
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { CircleCheck } from "lucide-react";
import { Vehicle, PaymentStatus, PaintStatus } from "@/types/inventory";
import { VehicleActionsDropdown } from "./VehicleActionsDropdown";
import { renderImportStatus, renderWorkshopStatus, renderPaintStatus, renderLocationStatus } from "./StatusRenderers";

interface VehicleB2CTableRowProps {
  vehicle: Vehicle;
  selectedVehicles: string[];
  toggleSelectVehicle: (id: string, checked: boolean) => void;
  handleSelectVehicle: (vehicle: Vehicle) => void;
  handleSendEmail: (type: string, vehicleId: string) => void;
  handleChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  onDeliveryConfirm: (vehicleId: string) => void;
}

export const VehicleB2CTableRow: React.FC<VehicleB2CTableRowProps> = ({
  vehicle,
  selectedVehicles,
  toggleSelectVehicle,
  handleSelectVehicle,
  handleSendEmail,
  handleChangeStatus,
  onDeliveryConfirm
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <TableRow className="cursor-pointer hover:bg-gray-50">
          <TableCell className="w-12 p-4 text-left" onClick={(e) => e.stopPropagation()}>
            <Checkbox 
              checked={selectedVehicles.includes(vehicle.id)} 
              onCheckedChange={(checked) => toggleSelectVehicle(vehicle.id, checked === true)} 
              aria-label={`Selecteer ${vehicle.brand} ${vehicle.model}`}
            />
          </TableCell>
          <TableCell className="w-32 p-4 text-left font-medium" onClick={() => handleSelectVehicle(vehicle)}>
            {vehicle.brand}
          </TableCell>
          <TableCell className="w-32 p-4 text-left" onClick={() => handleSelectVehicle(vehicle)}>
            {vehicle.model}
          </TableCell>
          <TableCell className="w-32 p-4 text-left" onClick={() => handleSelectVehicle(vehicle)}>
            {vehicle.mileage.toLocaleString()} km
          </TableCell>
          <TableCell className="w-40 p-4 text-left" onClick={() => handleSelectVehicle(vehicle)}>
            {vehicle.vin}
          </TableCell>
          <TableCell className="w-32 p-4 text-left font-medium" onClick={() => handleSelectVehicle(vehicle)}>
            {vehicle.purchasePrice ? `€ ${vehicle.purchasePrice.toLocaleString()}` : '-'}
          </TableCell>
          <TableCell className="w-32 p-4 text-left font-medium" onClick={() => handleSelectVehicle(vehicle)}>
            € {vehicle.sellingPrice.toLocaleString()}
          </TableCell>
          <TableCell className="w-32 p-4 text-left" onClick={() => handleSelectVehicle(vehicle)}>
            {vehicle.customerName || "Onbekend"}
          </TableCell>
          <TableCell className="w-32 p-4 text-left" onClick={() => handleSelectVehicle(vehicle)}>
            {renderImportStatus(vehicle.importStatus)}
          </TableCell>
          <TableCell className="w-32 p-4 text-left" onClick={() => handleSelectVehicle(vehicle)}>
            {renderWorkshopStatus(vehicle.workshopStatus)}
          </TableCell>
          <TableCell className="w-28 p-4 text-left" onClick={() => handleSelectVehicle(vehicle)}>
            {renderPaintStatus(vehicle.paintStatus)}
          </TableCell>
          <TableCell className="w-28 p-4 text-left" onClick={() => handleSelectVehicle(vehicle)}>
            {renderLocationStatus(vehicle.location)}
          </TableCell>
          <TableCell className="w-12 p-4 text-center" onClick={(e) => e.stopPropagation()}>
            <VehicleActionsDropdown
              vehicle={vehicle}
              handleSendEmail={handleSendEmail}
              handleChangeStatus={handleChangeStatus}
              onDeliveryConfirm={onDeliveryConfirm}
            />
          </TableCell>
        </TableRow>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-popover border shadow-md z-50">
        <ContextMenuItem onClick={() => handleSelectVehicle(vehicle)}>
          Bekijk details
        </ContextMenuItem>
        
        {handleChangeStatus && (
          <>
            <ContextMenuItem onClick={() => handleChangeStatus(vehicle.id, "verkocht_b2b")}>
              Markeer als verkocht B2B
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleChangeStatus(vehicle.id, "verkocht_b2c")}>
              Markeer als verkocht particulier
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleChangeStatus(vehicle.id, "voorraad")}>
              Zet terug naar voorraad
            </ContextMenuItem>
          </>
        )}
        
        {vehicle.paymentStatus === "volledig_betaald" && (
          <ContextMenuItem onClick={() => onDeliveryConfirm(vehicle.id)}>
            <CircleCheck className="h-4 w-4 mr-2" />
            Markeer als afgeleverd
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
