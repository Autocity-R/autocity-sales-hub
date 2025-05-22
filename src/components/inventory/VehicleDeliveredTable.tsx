
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronUp, ChevronDown, FileText } from "lucide-react";
import { Vehicle } from "@/types/inventory";

interface VehicleDeliveredTableProps {
  vehicles: Vehicle[];
  selectedVehicles: string[];
  toggleSelectAll: (checked: boolean) => void;
  toggleSelectVehicle: (id: string, checked: boolean) => void;
  formatDeliveryDate: (date: Date | string | null | undefined) => string;
  isLoading: boolean;
  error: unknown;
  onSort: (field: string) => void;
  sortField: string | null;
  sortDirection: "asc" | "desc";
}

export const VehicleDeliveredTable: React.FC<VehicleDeliveredTableProps> = ({
  vehicles,
  selectedVehicles,
  toggleSelectAll,
  toggleSelectVehicle,
  formatDeliveryDate,
  isLoading,
  error,
  onSort,
  sortField,
  sortDirection
}) => {
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const handleSort = (field: string) => {
    onSort(field);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-10 w-full mb-4" />
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full mb-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Fout bij het laden van voertuigen</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox 
              checked={selectedVehicles.length === vehicles.length && vehicles.length > 0} 
              onCheckedChange={toggleSelectAll} 
              aria-label="Selecteer alle voertuigen"
            />
          </TableHead>
          <TableHead className="cursor-pointer" onClick={() => handleSort("brand")}>
            <div className="flex items-center">
              Merk
              {renderSortIcon("brand")}
            </div>
          </TableHead>
          <TableHead className="cursor-pointer" onClick={() => handleSort("model")}>
            <div className="flex items-center">
              Model
              {renderSortIcon("model")}
            </div>
          </TableHead>
          <TableHead className="cursor-pointer" onClick={() => handleSort("licenseNumber")}>
            <div className="flex items-center">
              Kenteken
              {renderSortIcon("licenseNumber")}
            </div>
          </TableHead>
          <TableHead>
            <div className="flex items-center">
              Klantnaam
            </div>
          </TableHead>
          <TableHead className="cursor-pointer" onClick={() => handleSort("deliveryDate")}>
            <div className="flex items-center">
              Datum aflevering
              {renderSortIcon("deliveryDate")}
            </div>
          </TableHead>
          <TableHead>
            <div className="flex items-center">
              Documenten
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehicles.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              Geen afgeleverde voertuigen gevonden
            </TableCell>
          </TableRow>
        ) : (
          vehicles.map((vehicle) => (
            <TableRow key={vehicle.id} className="hover:bg-muted/50">
              <TableCell className="align-middle">
                <Checkbox 
                  checked={selectedVehicles.includes(vehicle.id)} 
                  onCheckedChange={(checked) => toggleSelectVehicle(vehicle.id, checked === true)} 
                  aria-label={`Selecteer ${vehicle.brand} ${vehicle.model}`}
                />
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
              <TableCell className="align-middle">
                {vehicle.customerName || "Onbekend"}
              </TableCell>
              <TableCell className="align-middle">
                {formatDeliveryDate(vehicle.deliveryDate)}
              </TableCell>
              <TableCell className="align-middle">
                {vehicle.papersReceived ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center">
                    <FileText className="h-3 w-3 mr-1" />
                    Compleet
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    Incompleet
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
