
import React from "react";
import { ChevronRight, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Vehicle } from "@/types/inventory";

interface TransportVehicleTableProps {
  vehicles: Vehicle[];
  onSelectVehicle: (vehicle: Vehicle) => void;
  onMarkAsArrived: (vehicleId: string) => void;
  onSendPickupDocument: (vehicleId: string) => void;
  isLoading: boolean;
  error: unknown;
}

export const TransportVehicleTable: React.FC<TransportVehicleTableProps> = ({
  vehicles,
  onSelectVehicle,
  onMarkAsArrived,
  onSendPickupDocument,
  isLoading,
  error
}) => {
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
        return "Niet gestart";
      case "transport_geregeld":
        return "Transport geregeld";
      case "onderweg":
        return "Onderweg";
      default:
        return status;
    }
  };

  const getPickupStatus = (vehicle: Vehicle) => {
    if (vehicle.cmrSent) {
      return "Gereed";
    }
    return "Niet gereed";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Merk</th>
            <th className="px-4 py-3 text-left font-medium">Model</th>
            <th className="px-4 py-3 text-left font-medium">Kilometerstand</th>
            <th className="px-4 py-3 text-left font-medium">Leverancier</th>
            <th className="px-4 py-3 text-left font-medium">Land</th>
            <th className="px-4 py-3 text-left font-medium">Pickup status</th>
            <th className="px-4 py-3 text-left font-medium">Transport status</th>
            <th className="px-4 py-3 text-center font-medium">Acties</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {vehicles.map((vehicle) => (
            <tr 
              key={vehicle.id}
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => onSelectVehicle(vehicle)}
            >
              <td className="px-4 py-3">{vehicle.brand}</td>
              <td className="px-4 py-3">{vehicle.model}</td>
              <td className="px-4 py-3">{vehicle.mileage} km</td>
              <td className="px-4 py-3">Leverancier XYZ</td>
              <td className="px-4 py-3">Duitsland</td>
              <td className="px-4 py-3">{getPickupStatus(vehicle)}</td>
              <td className="px-4 py-3">{formatImportStatus(vehicle.importStatus)}</td>
              <td className="px-4 py-3 flex justify-center space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendPickupDocument(vehicle.id);
                  }}
                  title="Verstuur pickup document"
                >
                  <FileText className="h-4 w-4" />
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
