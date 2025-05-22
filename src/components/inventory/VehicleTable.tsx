
import React from "react";
import { Vehicle, ImportStatus } from "@/types/inventory";
import { CircleCheck, CircleX, ExternalLink, Mail, MoreHorizontal, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { Car } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

interface VehicleTableProps {
  vehicles: Vehicle[];
  selectedVehicles: string[];
  toggleSelectAll: (checked: boolean) => void;
  toggleSelectVehicle: (vehicleId: string, checked: boolean) => void;
  handleSelectVehicle: (vehicle: Vehicle) => void;
  handleSendEmail: (type: string, vehicleId: string) => void;
  handleChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  handleDeleteVehicle?: (vehicleId: string) => void;
  isLoading: boolean;
  error: unknown;
  onSort?: (field: string) => void;
  sortField?: string | null;
  sortDirection?: "asc" | "desc";
}

export const renderImportStatusBadge = (status: ImportStatus) => {
  const statusMap: Record<ImportStatus, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
    niet_gestart: { label: "Niet gestart", variant: "outline" },
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

// Helper to calculate stay days
const calculateStaDagen = (createdAt: Date | string | undefined): number => {
  if (!createdAt) return 0;
  const now = new Date();
  const created = new Date(createdAt);
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 3600 * 24));
};

export const VehicleTable: React.FC<VehicleTableProps> = ({
  vehicles,
  selectedVehicles,
  toggleSelectAll,
  toggleSelectVehicle,
  handleSelectVehicle,
  handleSendEmail,
  handleChangeStatus,
  handleDeleteVehicle,
  isLoading,
  error,
  onSort,
  sortField,
  sortDirection
}) => {
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    
    return sortDirection === "asc" ? 
      <ArrowUp className="ml-1 h-4 w-4 inline" /> : 
      <ArrowDown className="ml-1 h-4 w-4 inline" />;
  };

  const renderSortableHeader = (field: string, label: string) => {
    return (
      <div 
        className="flex items-center cursor-pointer" 
        onClick={() => onSort && onSort(field)}
      >
        {label} {renderSortIcon(field)}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center">Laden...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">Er is een fout opgetreden bij het laden van de gegevens.</div>;
  }

  if (vehicles.length === 0) {
    return (
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <CustomCheckbox disabled />
            </TableHead>
            <TableHead className="w-[70px]">Foto</TableHead>
            <TableHead className="w-[100px]">
              {renderSortableHeader("brand", "Merk")}
            </TableHead>
            <TableHead>
              {renderSortableHeader("model", "Model")}
            </TableHead>
            <TableHead className="w-[120px]">
              {renderSortableHeader("licenseNumber", "Kenteken")}
            </TableHead>
            <TableHead>
              {renderSortableHeader("vin", "VIN")}
            </TableHead>
            <TableHead>
              {renderSortableHeader("mileage", "KM Stand")}
            </TableHead>
            <TableHead className="w-[150px]">
              {renderSortableHeader("importStatus", "Importstatus")}
            </TableHead>
            <TableHead>
              {renderSortableHeader("location", "Locatie")}
            </TableHead>
            <TableHead className="text-center">
              {renderSortableHeader("arrived", "Aangekomen")}
            </TableHead>
            <TableHead className="text-center">
              {renderSortableHeader("papersReceived", "Papieren")}
            </TableHead>
            <TableHead className="text-center">
              {renderSortableHeader("showroomOnline", "Online")}
            </TableHead>
            <TableHead className="text-center w-[90px]">
              {renderSortableHeader("staDagen", "Stadagen")}
            </TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={14} className="h-24 text-center">
              Geen voertuigen gevonden.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">
            <CustomCheckbox 
              onCheckedChange={(checked) => toggleSelectAll(!!checked)}
              checked={selectedVehicles.length === vehicles.length && vehicles.length > 0}
              indeterminate={selectedVehicles.length > 0 && selectedVehicles.length < vehicles.length}
            />
          </TableHead>
          <TableHead className="w-[70px]">Foto</TableHead>
          <TableHead className="w-[100px]">
            {renderSortableHeader("brand", "Merk")}
          </TableHead>
          <TableHead>
            {renderSortableHeader("model", "Model")}
          </TableHead>
          <TableHead className="w-[120px]">
            {renderSortableHeader("licenseNumber", "Kenteken")}
          </TableHead>
          <TableHead>
            {renderSortableHeader("vin", "VIN")}
          </TableHead>
          <TableHead>
            {renderSortableHeader("mileage", "KM Stand")}
          </TableHead>
          <TableHead className="w-[150px]">
            {renderSortableHeader("importStatus", "Importstatus")}
          </TableHead>
          <TableHead>
            {renderSortableHeader("location", "Locatie")}
          </TableHead>
          <TableHead className="text-center">
            {renderSortableHeader("arrived", "Aangekomen")}
          </TableHead>
          <TableHead className="text-center">
            {renderSortableHeader("papersReceived", "Papieren")}
          </TableHead>
          <TableHead className="text-center">
            {renderSortableHeader("showroomOnline", "Online")}
          </TableHead>
          <TableHead className="text-center w-[90px]">
            {renderSortableHeader("staDagen", "Stadagen")}
          </TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehicles.map((vehicle) => (
          <TableRow 
            key={vehicle.id}
            className="cursor-pointer hover:bg-muted"
            onClick={() => handleSelectVehicle(vehicle)}
          >
            <TableCell onClick={(e) => e.stopPropagation()}>
              <CustomCheckbox 
                checked={selectedVehicles.includes(vehicle.id)}
                onCheckedChange={(checked) => toggleSelectVehicle(vehicle.id, !!checked)}
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
            <TableCell>{vehicle.licenseNumber}</TableCell>
            <TableCell>{vehicle.vin}</TableCell>
            <TableCell>{vehicle.mileage.toLocaleString('nl-NL')} km</TableCell>
            <TableCell>{renderImportStatusBadge(vehicle.importStatus)}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {vehicle.location}
              </Badge>
            </TableCell>
            <TableCell className="text-center">
              {vehicle.arrived ? (
                <CircleCheck className="h-5 w-5 text-green-500 mx-auto" />
              ) : (
                <CircleX className="h-5 w-5 text-red-500 mx-auto" />
              )}
            </TableCell>
            <TableCell className="text-center">
              {vehicle.papersReceived ? (
                <CircleCheck className="h-5 w-5 text-green-500 mx-auto" />
              ) : (
                <CircleX className="h-5 w-5 text-red-500 mx-auto" />
              )}
            </TableCell>
            <TableCell className="text-center">
              {vehicle.showroomOnline ? (
                <CircleCheck className="h-5 w-5 text-green-500 mx-auto" />
              ) : (
                <CircleX className="h-5 w-5 text-red-500 mx-auto" />
              )}
            </TableCell>
            <TableCell className="text-center">
              {calculateStaDagen(vehicle.createdAt)} dagen
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
                    handleSendEmail("transport_pickup", vehicle.id);
                  }}>
                    <Mail className="h-4 w-4 mr-2" />
                    Pickup document sturen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleSendEmail("cmr_supplier", vehicle.id);
                  }}>
                    <Mail className="h-4 w-4 mr-2" />
                    CMR naar leverancier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleSendEmail("bpm_huys", vehicle.id);
                  }}>
                    <Mail className="h-4 w-4 mr-2" />
                    BPM Huys aanmelden
                  </DropdownMenuItem>
                  
                  {handleChangeStatus && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Verkoopstatus</DropdownMenuLabel>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleChangeStatus(vehicle.id, 'verkocht_b2c');
                      }}>
                        Verkocht B2C
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleChangeStatus(vehicle.id, 'verkocht_b2b');
                      }}>
                        Verkocht B2B
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleChangeStatus(vehicle.id, 'voorraad');
                      }}>
                        Terug naar voorraad
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {handleDeleteVehicle && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Weet je zeker dat je dit voertuig wilt verwijderen?')) {
                            handleDeleteVehicle(vehicle.id);
                          }
                        }}
                        className="text-red-500 focus:text-red-500"
                      >
                        Verwijderen
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
