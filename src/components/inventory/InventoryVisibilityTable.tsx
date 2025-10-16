import React, { memo, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, MoreHorizontal, Mail, Truck, Car, Check } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Vehicle, ImportStatus } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InventoryVisibilityTableProps {
  vehicles: Vehicle[];
  selectedVehicles: string[];
  toggleSelectAll: (checked: boolean) => void;
  toggleSelectVehicle: (id: string, checked: boolean) => void;
  handleSelectVehicle: (vehicle: Vehicle) => void;
  handleSendEmail: (type: string, vehicleId: string) => void;
  handleChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  handleMarkAsDelivered?: (vehicleId: string) => void;
  handleMarkAsArrived?: (vehicleId: string) => void;
  isLoading: boolean;
  error: unknown;
  onSort: (field: string) => void;
  sortField: string | null;
  sortDirection: "asc" | "desc";
}

const renderImportStatusBadge = (status: ImportStatus) => {
  const statusMap: Record<ImportStatus, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
    niet_aangemeld: { label: "Niet", variant: "outline" },
    aanvraag_ontvangen: { label: "Aanvraag", variant: "outline" },
    goedgekeurd: { label: "Goedgek.", variant: "secondary" },
    bpm_betaald: { label: "BPM OK", variant: "default" },
    ingeschreven: { label: "Ingescr.", variant: "default" }
  };
  
  const statusInfo = statusMap[status] || { label: status.replace(/_/g, ' '), variant: "outline" as const };
  const { label, variant } = statusInfo;
  return <Badge variant={variant} className="text-xs">{label}</Badge>;
};

const VehicleRow = memo<{
  vehicle: Vehicle;
  isSelected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onSendEmail: (type: string, vehicleId: string) => void;
  onChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  onMarkAsDelivered?: (vehicleId: string) => void;
  onMarkAsArrived?: (vehicleId: string) => void;
}>(({ 
  vehicle, 
  isSelected, 
  onToggleSelect, 
  onSelectVehicle, 
  onSendEmail, 
  onChangeStatus, 
  onMarkAsDelivered,
  onMarkAsArrived 
}) => {
  const formatPrice = (price: number | undefined) => {
    if (!price) return "€ -";
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
  };

  const formatMileage = (mileage: number | undefined) => {
    if (!mileage) return "-";
    return new Intl.NumberFormat('nl-NL').format(mileage);
  };

  const calculateStandingDays = (createdAt: string | Date | undefined) => {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isVehicleSold = vehicle.salesStatus === 'verkocht_b2b' || vehicle.salesStatus === 'verkocht_b2c';

  return (
    <TableRow 
      className="hover:bg-muted/50 cursor-pointer"
      onClick={() => onSelectVehicle(vehicle)}
    >
      <TableCell className="align-middle pl-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={(checked) => onToggleSelect(vehicle.id, checked === true)} 
          aria-label={`Selecteer ${vehicle.brand} ${vehicle.model}`}
        />
      </TableCell>
      <TableCell className="align-middle p-1">
        {vehicle.mainPhotoUrl ? (
          <div className="w-16 h-12 rounded overflow-hidden">
            <img 
              src={vehicle.mainPhotoUrl} 
              alt={`${vehicle.brand} ${vehicle.model}`} 
              className="object-cover w-full h-full"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
            <Car className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </TableCell>
      <TableCell className="align-middle">
        <div className="font-medium leading-tight">{vehicle.brand}</div>
        <div className="text-xs text-muted-foreground leading-tight">{vehicle.model}</div>
      </TableCell>
      <TableCell className="align-middle">
        <div className="font-medium text-sm leading-tight">{vehicle.licenseNumber}</div>
        <div className="text-xs text-muted-foreground break-words leading-tight">{vehicle.vin}</div>
      </TableCell>
      <TableCell className="align-middle text-right">
        <div className="text-xs text-muted-foreground leading-tight">Ink: {formatPrice(vehicle.purchasePrice)}</div>
        <div className="font-medium text-sm leading-tight">Verk: {formatPrice(vehicle.sellingPrice)}</div>
      </TableCell>
      <TableCell className="align-middle text-right">
        <div className="text-sm">{formatMileage(vehicle.mileage)}</div>
        <div className="text-xs text-muted-foreground">km</div>
      </TableCell>
      <TableCell className="align-middle">
        {renderImportStatusBadge(vehicle.importStatus)}
      </TableCell>
      <TableCell className="align-middle">
        <Badge variant="outline" className="text-xs capitalize">
          {vehicle.location}
        </Badge>
      </TableCell>
      <TableCell className="align-middle">
        <div className="flex flex-col gap-0.5">
          {vehicle.arrived ? (
            <Badge variant="default" className="bg-green-100 text-green-800 text-xs px-1 py-0">✓</Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 text-xs px-1 py-0">⏳</Badge>
          )}
          {vehicle.papersReceived ? (
            <Badge variant="default" className="bg-green-100 text-green-800 text-xs px-1 py-0">📄</Badge>
          ) : (
            <Badge variant="outline" className="bg-red-100 text-red-800 text-xs px-1 py-0">📄</Badge>
          )}
          {vehicle.showroomOnline ? (
            <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs px-1 py-0">🌐</Badge>
          ) : (
            <Badge variant="outline" className="text-xs px-1 py-0">🌐</Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="align-middle text-center">
        <Badge variant="secondary" className="text-xs">
          {calculateStandingDays(vehicle.createdAt)}d
        </Badge>
      </TableCell>
      <TableCell className="align-middle" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>E-mail acties</DropdownMenuLabel>
            
            {isVehicleSold && (
              <>
                <DropdownMenuItem onClick={() => onSendEmail("contract_b2c_digital", vehicle.id)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Koopcontract B2C
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSendEmail("contract_b2b_digital", vehicle.id)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Koopcontract B2B
                </DropdownMenuItem>
              </>
            )}
            
            <DropdownMenuItem onClick={() => onSendEmail("delivery_appointment", vehicle.id)}>
              <Mail className="h-4 w-4 mr-2" />
              Aflevering afspraak
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSendEmail("cmr_supplier", vehicle.id)}>
              <Mail className="h-4 w-4 mr-2" />
              CMR Leverancier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSendEmail("transport_pickup", vehicle.id)}>
              <Mail className="h-4 w-4 mr-2" />
              Transport Pickup
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSendEmail("bpm_huys", vehicle.id)}>
              <Mail className="h-4 w-4 mr-2" />
              BPM Huys aanmelden
            </DropdownMenuItem>
            
            {!vehicle.arrived && onMarkAsArrived && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Status acties</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onMarkAsArrived(vehicle.id)}>
                  <Check className="h-4 w-4 mr-2" />
                  Markeer als aangekomen
                </DropdownMenuItem>
              </>
            )}
            
            {onChangeStatus && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Verkoopstatus</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onChangeStatus(vehicle.id, "verkocht_b2c")}>
                  Verkocht B2C
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeStatus(vehicle.id, "verkocht_b2b")}>
                  Verkocht B2B
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeStatus(vehicle.id, "voorraad")}>
                  Terug naar voorraad
                </DropdownMenuItem>
              </>
            )}
            {onMarkAsDelivered && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onMarkAsDelivered(vehicle.id)}>
                  <Truck className="h-4 w-4 mr-2" />
                  Afgeleverd
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

export const InventoryVisibilityTable = memo<InventoryVisibilityTableProps>(({
  vehicles,
  selectedVehicles,
  toggleSelectAll,
  toggleSelectVehicle,
  handleSelectVehicle,
  handleSendEmail,
  handleChangeStatus,
  handleMarkAsDelivered,
  handleMarkAsArrived,
  isLoading,
  error,
  onSort,
  sortField,
  sortDirection
}) => {
  const renderSortIcon = useMemo(() => {
    return (field: string) => {
      if (sortField !== field) return null;
      return sortDirection === "asc" ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;
    };
  }, [sortField, sortDirection]);

  const isAllSelected = useMemo(() => {
    return selectedVehicles.length === vehicles.length && vehicles.length > 0;
  }, [selectedVehicles.length, vehicles.length]);

  if (isLoading) {
    return <div className="p-4 text-center">Laden...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Fout bij het laden van voertuigen</div>;
  }

  return (
    <TooltipProvider>
      <div className="min-w-0 w-full border-y">
        <Table className="w-full border-separate border-spacing-0 text-sm" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '36px' }} /> {/* Checkbox */}
            <col style={{ width: '72px' }} /> {/* Foto */}
            <col style={{ width: '16%' }} /> {/* Merk/Model */}
            <col style={{ width: '14%' }} /> {/* Kenteken/VIN */}
            <col style={{ width: '13%' }} /> {/* Prijzen */}
            <col style={{ width: '8%' }} /> {/* KM */}
            <col style={{ width: '9%' }} /> {/* Import */}
            <col style={{ width: '9%' }} /> {/* Locatie */}
            <col style={{ width: '7%' }} /> {/* Status */}
            <col style={{ width: '6%' }} /> {/* Dagen */}
            <col style={{ width: '7%' }} /> {/* Acties */}
          </colgroup>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="pl-0">
                <Checkbox 
                  checked={isAllSelected} 
                  onCheckedChange={toggleSelectAll} 
                  aria-label="Selecteer alle voertuigen"
                />
              </TableHead>
              <TableHead className="text-xs">Foto</TableHead>
              <TableHead className="cursor-pointer text-xs" onClick={() => onSort("brand")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      Merk/Model
                      {renderSortIcon("brand")}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Merk en Model</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="cursor-pointer text-xs" onClick={() => onSort("licenseNumber")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      Kent./VIN
                      {renderSortIcon("licenseNumber")}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Kenteken en VIN</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="cursor-pointer text-xs text-right" onClick={() => onSort("sellingPrice")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-end">
                      Prijzen
                      {renderSortIcon("sellingPrice")}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Inkoopprijs en Verkoopprijs</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="cursor-pointer text-xs text-right" onClick={() => onSort("mileage")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-end">
                      KM
                      {renderSortIcon("mileage")}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Kilometerstand</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="cursor-pointer text-xs" onClick={() => onSort("importStatus")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      Import
                      {renderSortIcon("importStatus")}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Importstatus</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="cursor-pointer text-xs" onClick={() => onSort("location")}>
                <div className="flex items-center">
                  Locatie
                  {renderSortIcon("location")}
                </div>
              </TableHead>
              <TableHead className="text-xs">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>Status</div>
                  </TooltipTrigger>
                  <TooltipContent>Aangekomen / Papieren / Online</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="cursor-pointer text-xs text-center" onClick={() => onSort("createdAt")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center">
                      Dgn
                      {renderSortIcon("createdAt")}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Sta dagen</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-xs">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Geen voertuigen gevonden
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((vehicle) => (
                <VehicleRow
                  key={vehicle.id}
                  vehicle={vehicle}
                  isSelected={selectedVehicles.includes(vehicle.id)}
                  onToggleSelect={toggleSelectVehicle}
                  onSelectVehicle={handleSelectVehicle}
                  onSendEmail={handleSendEmail}
                  onChangeStatus={handleChangeStatus}
                  onMarkAsDelivered={handleMarkAsDelivered}
                  onMarkAsArrived={handleMarkAsArrived}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
});

InventoryVisibilityTable.displayName = "InventoryVisibilityTable";
VehicleRow.displayName = "VehicleRow";
