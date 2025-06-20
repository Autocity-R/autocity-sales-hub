import React, { memo, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, MoreHorizontal, Mail, Truck, Car, FileText, Check } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Vehicle, ImportStatus } from "@/types/inventory";
import { Avatar } from "@/components/ui/avatar";

interface VehicleTableProps {
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

// Memoized row component to prevent unnecessary re-renders
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
  const formatPrice = useMemo(() => {
    return (price: number | undefined) => {
      if (!price) return "€ -";
      return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price);
    };
  }, []);

  const formatMileage = useMemo(() => {
    return (mileage: number | undefined) => {
      if (!mileage) return "- km";
      return new Intl.NumberFormat('nl-NL').format(mileage) + " km";
    };
  }, []);

  const calculateStandingDays = (createdAt: string | Date | undefined) => {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Check if vehicle is sold to determine if contract emails should be shown
  const isVehicleSold = vehicle.salesStatus === 'verkocht_b2b' || vehicle.salesStatus === 'verkocht_b2c';

  return (
    <TableRow 
      className="hover:bg-muted/50 cursor-pointer"
      onClick={() => onSelectVehicle(vehicle)}
    >
      <TableCell className="align-middle" onClick={(e) => e.stopPropagation()}>
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={(checked) => onToggleSelect(vehicle.id, checked === true)} 
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
        {vehicle.licenseNumber}
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
        {formatMileage(vehicle.mileage)}
      </TableCell>
      <TableCell className="align-middle">
        {renderImportStatusBadge(vehicle.importStatus)}
      </TableCell>
      <TableCell className="align-middle">
        <Badge variant="outline" className="capitalize">
          {vehicle.location}
        </Badge>
      </TableCell>
      <TableCell className="align-middle text-center">
        {vehicle.arrived ? (
          <Badge variant="default" className="bg-green-100 text-green-800">Ja</Badge>
        ) : (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Nee</Badge>
        )}
      </TableCell>
      <TableCell className="align-middle text-center">
        {vehicle.papersReceived ? (
          <Badge variant="default" className="bg-green-100 text-green-800">Ja</Badge>
        ) : (
          <Badge variant="outline" className="bg-red-100 text-red-800">Nee</Badge>
        )}
      </TableCell>
      <TableCell className="align-middle text-center">
        {vehicle.showroomOnline ? (
          <Badge variant="default" className="bg-blue-100 text-blue-800">Online</Badge>
        ) : (
          <Badge variant="outline">Offline</Badge>
        )}
      </TableCell>
      <TableCell className="align-middle">
        <Badge variant="secondary">
          {calculateStandingDays(vehicle.createdAt)} dagen
        </Badge>
      </TableCell>
      <TableCell className="align-middle" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>E-mail acties</DropdownMenuLabel>
            
            {/* Only show contract emails for sold vehicles */}
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

export const VehicleTable = memo<VehicleTableProps>(({
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
      return sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
    };
  }, [sortField, sortDirection]);

  const handleSort = useMemo(() => {
    return (field: string) => {
      onSort(field);
    };
  }, [onSort]);

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
    <div className="w-full overflow-x-auto">
      <Table className="w-full min-w-[1600px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={isAllSelected} 
                onCheckedChange={toggleSelectAll} 
                aria-label="Selecteer alle voertuigen"
              />
            </TableHead>
            <TableHead className="w-16">Foto</TableHead>
            <TableHead className="min-w-20 cursor-pointer" onClick={() => handleSort("brand")}>
              <div className="flex items-center">
                Merk
                {renderSortIcon("brand")}
              </div>
            </TableHead>
            <TableHead className="min-w-24 cursor-pointer" onClick={() => handleSort("model")}>
              <div className="flex items-center">
                Model
                {renderSortIcon("model")}
              </div>
            </TableHead>
            <TableHead className="min-w-28 cursor-pointer" onClick={() => handleSort("licenseNumber")}>
              <div className="flex items-center">
                Kenteken
                {renderSortIcon("licenseNumber")}
              </div>
            </TableHead>
            <TableHead className="min-w-32 cursor-pointer" onClick={() => handleSort("vin")}>
              <div className="flex items-center">
                VIN
                {renderSortIcon("vin")}
              </div>
            </TableHead>
            <TableHead className="min-w-28 cursor-pointer" onClick={() => handleSort("purchasePrice")}>
              <div className="flex items-center">
                Inkoopprijs
                {renderSortIcon("purchasePrice")}
              </div>
            </TableHead>
            <TableHead className="min-w-28 cursor-pointer" onClick={() => handleSort("sellingPrice")}>
              <div className="flex items-center">
                Verkoopprijs
                {renderSortIcon("sellingPrice")}
              </div>
            </TableHead>
            <TableHead className="min-w-20 cursor-pointer" onClick={() => handleSort("mileage")}>
              <div className="flex items-center">
                KM Stand
                {renderSortIcon("mileage")}
              </div>
            </TableHead>
            <TableHead className="min-w-32 cursor-pointer" onClick={() => handleSort("importStatus")}>
              <div className="flex items-center">
                Importstatus
                {renderSortIcon("importStatus")}
              </div>
            </TableHead>
            <TableHead className="min-w-24 cursor-pointer" onClick={() => handleSort("location")}>
              <div className="flex items-center">
                Locatie
                {renderSortIcon("location")}
              </div>
            </TableHead>
            <TableHead className="min-w-20 cursor-pointer" onClick={() => handleSort("arrived")}>
              <div className="flex items-center">
                Aangekomen
                {renderSortIcon("arrived")}
              </div>
            </TableHead>
            <TableHead className="min-w-20 cursor-pointer" onClick={() => handleSort("papersReceived")}>
              <div className="flex items-center">
                Papieren
                {renderSortIcon("papersReceived")}
              </div>
            </TableHead>
            <TableHead className="min-w-20 cursor-pointer" onClick={() => handleSort("showroomOnline")}>
              <div className="flex items-center">
                Online
                {renderSortIcon("showroomOnline")}
              </div>
            </TableHead>
            <TableHead className="min-w-20 cursor-pointer" onClick={() => handleSort("createdAt")}>
              <div className="flex items-center">
                Sta dagen
                {renderSortIcon("createdAt")}
              </div>
            </TableHead>
            <TableHead className="w-12">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
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
  );
});

VehicleTable.displayName = "VehicleTable";
VehicleRow.displayName = "VehicleRow";
