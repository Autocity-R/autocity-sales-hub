
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { VehicleActionsDropdown } from "./VehicleActionsDropdown";
import { Vehicle, ImportStatus, WorkshopStatus, PaintStatus } from "@/types/inventory";
import { Car } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

interface VehicleB2CTableRowProps {
  vehicle: Vehicle;
  selectedVehicles: string[];
  toggleSelectVehicle: (id: string, checked: boolean) => void;
  handleSelectVehicle: (vehicle: Vehicle) => void;
  handleSendEmail: (type: string, vehicleId: string) => void;
  handleChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  onDeliveryConfirm: (vehicleId: string) => void;
  onOpenContractConfig?: (vehicle: Vehicle, contractType: "b2b" | "b2c") => void;
}

const renderImportStatusBadge = (status: ImportStatus | undefined) => {
  const statusMap: Record<ImportStatus, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
    niet_aangemeld: { label: "Niet aangemeld", variant: "outline" },
    aangemeld: { label: "Aangemeld", variant: "outline" },
    goedgekeurd: { label: "Goedgekeurd", variant: "secondary" },
    bpm_betaald: { label: "BPM betaald", variant: "default" },
    ingeschreven: { label: "Ingeschreven", variant: "default" }
  };

  // Handle unknown status values with fallback
  const normalized = (status ?? "niet_aangemeld") as ImportStatus;
  const statusInfo = statusMap[normalized] || { label: (normalized as string).replace(/_/g, ' ').toUpperCase() || "ONBEKEND", variant: "outline" as const };
  const { label, variant } = statusInfo;
  return <Badge variant={variant}>{label}</Badge>;
};

const renderWorkshopStatusBadge = (status: WorkshopStatus) => {
  const statusMap: Record<WorkshopStatus, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
    wachten: { label: "Wachten", variant: "outline" },
    poetsen: { label: "Poetsen", variant: "secondary" },
    spuiten: { label: "Spuiten", variant: "secondary" },
    gereed: { label: "Gereed", variant: "default" },
    klaar_voor_aflevering: { label: "Klaar voor aflevering", variant: "default" },
    in_werkplaats: { label: "In werkplaats", variant: "secondary" },
    wacht_op_onderdelen: { label: "Wacht op onderdelen", variant: "outline" }
  };
  
  // Handle unknown status values with fallback
  const statusInfo = statusMap[status] || { label: status?.replace(/_/g, ' ').toUpperCase() || "Onbekend", variant: "outline" as const };
  const { label, variant } = statusInfo;
  return <Badge variant={variant}>{label}</Badge>;
};

const renderPaintStatusBadge = (status: PaintStatus | undefined) => {
  const normalized = (status ?? "geen_behandeling") as PaintStatus;

  const statusMap: Record<PaintStatus, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
    geen_behandeling: { label: "Geen behandeling", variant: "outline" },
    hersteld: { label: "Hersteld", variant: "default" },
    in_behandeling: { label: "In behandeling", variant: "secondary" }
  };

  const statusInfo = statusMap[normalized] ?? { label: (normalized as string).replace(/_/g, " ").toUpperCase() || "ONBEKEND", variant: "outline" as const };
  const { label, variant } = statusInfo;
  return <Badge variant={variant}>{label}</Badge>;
};

export const VehicleB2CTableRow: React.FC<VehicleB2CTableRowProps> = ({
  vehicle,
  selectedVehicles,
  toggleSelectVehicle,
  handleSelectVehicle,
  handleSendEmail,
  handleChangeStatus,
  onDeliveryConfirm,
  onOpenContractConfig
}) => {
  const formatPrice = (price: number | undefined) => {
    if (!price) return "€ -";
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price);
  };

  const formatMileage = (mileage: number | undefined) => {
    if (!mileage) return "- km";
    return new Intl.NumberFormat('nl-NL').format(mileage) + " km";
  };

  return (
    <TableRow 
      className="hover:bg-muted/50 cursor-pointer"
      onClick={() => handleSelectVehicle(vehicle)}
    >
      <TableCell className="align-middle" onClick={(e) => e.stopPropagation()}>
        <CustomCheckbox 
          checked={selectedVehicles.includes(vehicle.id)} 
          onCheckedChange={(checked) => toggleSelectVehicle(vehicle.id, checked === true)} 
          aria-label={`Selecteer ${vehicle.brand} ${vehicle.model}`}
        />
      </TableCell>
      <TableCell className="align-middle">
        {vehicle.mainPhotoUrl ? (
          <Avatar className="w-12 h-12 rounded-md">
            <img 
              src={vehicle.mainPhotoUrl} 
              alt={`${vehicle.brand} ${vehicle.model}`} 
              className="object-cover w-full h-full rounded-md"
            />
          </Avatar>
        ) : (
          <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
            <Car className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </TableCell>
      <TableCell className="align-middle font-medium">
        {vehicle.brand}
      </TableCell>
      <TableCell className="align-middle">
        {vehicle.model}
      </TableCell>
      <TableCell className="align-middle">
        {formatMileage(vehicle.mileage)}
      </TableCell>
      <TableCell className="align-middle truncate max-w-32">
        {vehicle.vin}
      </TableCell>
      <TableCell className="align-middle">
        {formatPrice(vehicle.purchasePrice)}
      </TableCell>
      <TableCell className="align-middle">
        {formatPrice(vehicle.sellingPrice)}
      </TableCell>
      <TableCell className="align-middle">
        {vehicle.customerName || "Onbekend"}
      </TableCell>
      <TableCell className="align-middle">
        {renderImportStatusBadge(vehicle.importStatus)}
      </TableCell>
      <TableCell className="align-middle">
        {renderWorkshopStatusBadge(vehicle.workshopStatus)}
      </TableCell>
      <TableCell className="align-middle">
        {renderPaintStatusBadge(vehicle.paintStatus)}
      </TableCell>
      <TableCell className="align-middle">
        <Badge variant="outline" className="capitalize">
          {vehicle.location}
        </Badge>
      </TableCell>
      <TableCell className="align-middle" onClick={(e) => e.stopPropagation()}>
        <VehicleActionsDropdown
          vehicle={vehicle}
          onSendEmail={handleSendEmail}
          handleChangeStatus={handleChangeStatus}
          onDeliveryConfirm={onDeliveryConfirm}
        />
      </TableCell>
    </TableRow>
  );
};
