
import React from "react";
import { Vehicle, ImportStatus } from "@/types/inventory";
import { CircleCheck, CircleX, ExternalLink, Mail } from "lucide-react";
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

interface VehicleTableProps {
  vehicles: Vehicle[];
  selectedVehicles: string[];
  toggleSelectAll: (checked: boolean) => void;
  toggleSelectVehicle: (vehicleId: string, checked: boolean) => void;
  handleSelectVehicle: (vehicle: Vehicle) => void;
  handleSendEmail: (type: string, vehicleId: string) => void;
  isLoading: boolean;
  error: unknown;
}

export const renderImportStatusBadge = (status: ImportStatus) => {
  const statusMap: Record<ImportStatus, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
    niet_gestart: { label: "Niet gestart", variant: "outline" },
    transport_geregeld: { label: "Transport geregeld", variant: "secondary" },
    onderweg: { label: "Onderweg", variant: "secondary" },
    aangekomen: { label: "Aangekomen", variant: "default" },
    afgemeld: { label: "Afgemeld", variant: "destructive" },
  };
  
  const { label, variant } = statusMap[status];
  
  return <Badge variant={variant}>{label}</Badge>;
};

export const VehicleTable: React.FC<VehicleTableProps> = ({
  vehicles,
  selectedVehicles,
  toggleSelectAll,
  toggleSelectVehicle,
  handleSelectVehicle,
  handleSendEmail,
  isLoading,
  error
}) => {
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
            <TableHead className="w-[150px]">
              <div className="flex items-center space-x-1">
                <Car className="h-4 w-4" />
                <span>Kenteken</span>
              </div>
            </TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Importstatus</TableHead>
            <TableHead className="text-center">Aangekomen</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
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
          <TableHead className="w-[150px]">
            <div className="flex items-center space-x-1">
              <Car className="h-4 w-4" />
              <span>Kenteken</span>
            </div>
          </TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Importstatus</TableHead>
          <TableHead className="text-center">Aangekomen</TableHead>
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
            <TableCell className="font-medium">{vehicle.licenseNumber}</TableCell>
            <TableCell>{vehicle.model}</TableCell>
            <TableCell>{renderImportStatusBadge(vehicle.importStatus)}</TableCell>
            <TableCell className="text-center">
              {vehicle.arrived ? (
                <CircleCheck className="h-5 w-5 text-green-500 mx-auto" />
              ) : (
                <CircleX className="h-5 w-5 text-red-500 mx-auto" />
              )}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="float-right"
                  >
                    <ExternalLink className="h-4 w-4" />
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
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
