
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { CircleCheck, CircleX, MoreHorizontal, Car, User, Building, Truck, Mail } from "lucide-react";
import { Vehicle, PaymentStatus, PaintStatus, ImportStatus } from "@/types/inventory";
import { VehicleActionsDropdown } from "./VehicleActionsDropdown";
import { renderImportStatus, renderWorkshopStatus, renderPaintStatus, renderLocationStatus } from "./StatusRenderers";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface VehicleB2CTableRowProps {
  vehicle: Vehicle;
  selectedVehicles: string[];
  toggleSelectVehicle: (id: string, checked: boolean) => void;
  handleSelectVehicle: (vehicle: Vehicle) => void;
  handleSendEmail: (type: string, vehicleId: string) => void;
  handleChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  onDeliveryConfirm: (vehicleId: string) => void;
}

const renderImportStatusBadge = (status: ImportStatus) => {
  const statusMap: Record<ImportStatus, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
    niet_gestart: { label: "Niet gestart", variant: "outline" },
    aangemeld: { label: "Aangemeld", variant: "outline" },
    goedgekeurd: { label: "Goedgekeurd", variant: "secondary" },
    transport_geregeld: { label: "Transport geregeld", variant: "secondary" },
    onderweg: { label: "Onderweg", variant: "secondary" },
    aangekomen: { label: "Aangekomen", variant: "default" },
    afgemeld: { label: "Afgemeld", variant: "destructive" },
    bpm_betaald: { label: "BPM betaald", variant: "default" },
    herkeuring: { label: "Herkeuring", variant: "secondary" },
    ingeschreven: { label: "Ingeschreven", variant: "default" }
  };
  
  const { label, variant } = statusMap[status];
  
  return <Badge variant={variant}>{label}</Badge>;
};

const renderPaymentStatusBadge = (status: PaymentStatus) => {
  const statusMap: Record<PaymentStatus, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
    niet_betaald: { label: "Niet betaald", variant: "destructive" },
    aanbetaling: { label: "Aanbetaling", variant: "secondary" },
    volledig_betaald: { label: "Volledig betaald", variant: "default" }
  };
  
  const { label, variant } = statusMap[status];
  
  return <Badge variant={variant}>{label}</Badge>;
};

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
        <TableRow className="cursor-pointer hover:bg-muted" onClick={() => handleSelectVehicle(vehicle)}>
          <TableCell onClick={(e) => e.stopPropagation()}>
            <Checkbox 
              checked={selectedVehicles.includes(vehicle.id)}
              onCheckedChange={(checked) => toggleSelectVehicle(vehicle.id, checked === true)} 
              aria-label={`Selecteer ${vehicle.brand} ${vehicle.model}`}
            />
          </TableCell>
          <TableCell>
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
          <TableCell className="font-medium">{vehicle.brand}</TableCell>
          <TableCell>{vehicle.model}</TableCell>
          <TableCell>{vehicle.mileage.toLocaleString('nl-NL')} km</TableCell>
          <TableCell>{vehicle.licenseNumber || '-'}</TableCell>
          <TableCell>{vehicle.vin}</TableCell>
          <TableCell className="font-medium">
            {vehicle.purchasePrice ? `€ ${vehicle.purchasePrice.toLocaleString('nl-NL')}` : '-'}
          </TableCell>
          <TableCell>
            {vehicle.sellingPrice ? (
              <span className="font-medium">€ {vehicle.sellingPrice.toLocaleString('nl-NL')}</span>
            ) : (
              <span className="text-muted-foreground">Niet ingesteld</span>
            )}
          </TableCell>
          <TableCell>
            {vehicle.customerName ? (
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{vehicle.customerName}</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">Geen klant</span>
            )}
          </TableCell>
          <TableCell>
            {vehicle.salespersonName ? (
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{vehicle.salespersonName}</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">Niet toegewezen</span>
            )}
          </TableCell>
          <TableCell>{renderImportStatusBadge(vehicle.importStatus)}</TableCell>
          <TableCell>
            <Badge variant="outline" className="capitalize">
              {vehicle.location}
            </Badge>
          </TableCell>
          <TableCell className="text-center">
            {vehicle.papersReceived ? (
              <CircleCheck className="h-5 w-5 text-green-500 mx-auto" />
            ) : (
              <CircleX className="h-5 w-5 text-red-500 mx-auto" />
            )}
          </TableCell>
          <TableCell>
            {renderPaymentStatusBadge(vehicle.paymentStatus || "niet_betaald")}
          </TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="float-right"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Snelle acties</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleSelectVehicle(vehicle);
                }}>
                  Details bekijken
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleSendEmail("contract_b2c", vehicle.id);
                }}>
                  <Mail className="h-4 w-4 mr-2" />
                  Koopcontract sturen
                </DropdownMenuItem>
                
                {vehicle.paymentStatus === "volledig_betaald" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeliveryConfirm(vehicle.id);
                      }}
                      className="text-red-500 focus:text-red-500"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Afgeleverd
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
