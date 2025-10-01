
import React, { useState } from "react";
import { ChevronRight, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Vehicle } from "@/types/inventory";

interface TransportVehicleTableProps {
  vehicles: Vehicle[];
  onSelectVehicle: (vehicle: Vehicle) => void;
  onMarkAsArrived: (vehicleId: string) => void;
  onSendPickupDocument: (vehicleId: string) => void;
  isLoading: boolean;
  error: unknown;
  onSelectMultiple?: (vehicleIds: string[]) => void;
}

export const TransportVehicleTable: React.FC<TransportVehicleTableProps> = ({
  vehicles,
  onSelectVehicle,
  onMarkAsArrived,
  onSendPickupDocument,
  isLoading,
  error,
  onSelectMultiple
}) => {
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="mt-2 text-muted-foreground">Gegevens laden...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        Er is een fout opgetreden bij het laden van de voertuigen.
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Geen voertuigen in transport gevonden.
      </div>
    );
  }

  const formatImportStatus = (status: string) => {
    switch (status) {
      case "niet_gestart":
        return "Niet ready";
      case "transport_geregeld":
        return "Opdracht gegeven";
      case "onderweg":
        return "Onderweg";
      default:
        return status;
    }
  };

  const getPickupStatus = (vehicle: Vehicle) => {
    if (vehicle.cmrSent) {
      return "Pickup ready";
    }
    return "Niet ready";
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVehicles(vehicles.map(v => v.id));
      onSelectMultiple?.(vehicles.map(v => v.id));
    } else {
      setSelectedVehicles([]);
      onSelectMultiple?.([]);
    }
  };

  const handleSelectVehicle = (vehicleId: string, checked: boolean) => {
    let newSelection: string[];
    
    if (checked) {
      newSelection = [...selectedVehicles, vehicleId];
    } else {
      newSelection = selectedVehicles.filter(id => id !== vehicleId);
    }
    
    setSelectedVehicles(newSelection);
    onSelectMultiple?.(newSelection);
  };

  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full min-w-[1200px]">
        <TableHeader>
          <TableRow>
            {onSelectMultiple && (
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedVehicles.length === vehicles.length && vehicles.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Selecteer alle voertuigen"
                />
              </TableHead>
            )}
            <TableHead className="min-w-20">Merk</TableHead>
            <TableHead className="min-w-24">Model</TableHead>
            <TableHead className="min-w-24">Kilometerstand</TableHead>
            <TableHead className="min-w-28">Kenteken</TableHead>
            <TableHead className="min-w-32">VIN</TableHead>
            <TableHead className="min-w-28">Inkoopprijs</TableHead>
            <TableHead className="min-w-28">Pickup status</TableHead>
            <TableHead className="min-w-32">Transport status</TableHead>
            <TableHead className="min-w-24 text-center">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow 
              key={vehicle.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectVehicle(vehicle)}
            >
              {onSelectMultiple && (
                <TableCell className="p-2" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={selectedVehicles.includes(vehicle.id)}
                    onCheckedChange={(checked) => handleSelectVehicle(vehicle.id, !!checked)}
                    aria-label={`Selecteer ${vehicle.brand} ${vehicle.model}`}
                  />
                </TableCell>
              )}
              <TableCell className="align-middle font-medium truncate">{vehicle.brand}</TableCell>
              <TableCell className="align-middle truncate">{vehicle.model}</TableCell>
              <TableCell className="align-middle">{vehicle.mileage} km</TableCell>
              <TableCell className="align-middle">{vehicle.licenseNumber || "Onbekend"}</TableCell>
              <TableCell className="align-middle truncate max-w-32">{vehicle.vin}</TableCell>
              <TableCell className="align-middle">€{vehicle.purchasePrice.toLocaleString('nl-NL')}</TableCell>
              <TableCell className="align-middle">{getPickupStatus(vehicle)}</TableCell>
              <TableCell className="align-middle">{formatImportStatus(vehicle.importStatus)}</TableCell>
              <TableCell className="align-middle" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendPickupDocument(vehicle.id);
                    }}
                    title="Verstuur pickup document"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Pickup versturen
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsArrived(vehicle.id);
                    }}
                    title="Voertuig binnenmelden"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVehicle(vehicle);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
