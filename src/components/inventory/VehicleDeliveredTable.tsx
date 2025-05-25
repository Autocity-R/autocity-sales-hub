
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
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
  onVehicleClick: (vehicle: Vehicle) => void;
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
  sortDirection,
  onVehicleClick
}) => {
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const handleSort = (field: string) => {
    onSort(field);
  };
  
  const formatPrice = (price: number | undefined) => {
    if (!price) return "€ -";
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price);
  };
  
  const formatMileage = (mileage: number | undefined) => {
    if (!mileage) return "- km";
    return new Intl.NumberFormat('nl-NL').format(mileage) + " km";
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
    <div className="w-full overflow-hidden">
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
            <TableHead className="hidden md:table-cell cursor-pointer" onClick={() => handleSort("mileage")}>
              <div className="flex items-center">
                KM
                {renderSortIcon("mileage")}
              </div>
            </TableHead>
            <TableHead className="hidden md:table-cell cursor-pointer" onClick={() => handleSort("licenseNumber")}>
              <div className="flex items-center">
                Kenteken
                {renderSortIcon("licenseNumber")}
              </div>
            </TableHead>
            <TableHead className="hidden sm:table-cell cursor-pointer" onClick={() => handleSort("sellingPrice")}>
              <div className="flex items-center">
                Prijs
                {renderSortIcon("sellingPrice")}
              </div>
            </TableHead>
            <TableHead className="hidden lg:table-cell cursor-pointer" onClick={() => handleSort("customerName")}>
              <div className="flex items-center">
                Klant
                {renderSortIcon("customerName")}
              </div>
            </TableHead>
            <TableHead className="hidden xl:table-cell cursor-pointer" onClick={() => handleSort("salespersonName")}>
              <div className="flex items-center">
                Verkoper
                {renderSortIcon("salespersonName")}
              </div>
            </TableHead>
            <TableHead className="hidden lg:table-cell cursor-pointer" onClick={() => handleSort("salesStatus")}>
              <div className="flex items-center">
                Type
                {renderSortIcon("salesStatus")}
              </div>
            </TableHead>
            <TableHead className="hidden xl:table-cell cursor-pointer" onClick={() => handleSort("deliveryDate")}>
              <div className="flex items-center">
                Aflevering
                {renderSortIcon("deliveryDate")}
              </div>
            </TableHead>
            <TableHead className="hidden lg:table-cell">
              <div className="flex items-center">
                Docs
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                Geen afgeleverde voertuigen gevonden
              </TableCell>
            </TableRow>
          ) : (
            vehicles.map((vehicle) => (
              <TableRow 
                key={vehicle.id} 
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => onVehicleClick(vehicle)}
              >
                <TableCell className="align-middle" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={selectedVehicles.includes(vehicle.id)} 
                    onCheckedChange={(checked) => toggleSelectVehicle(vehicle.id, checked === true)} 
                    aria-label={`Selecteer ${vehicle.brand} ${vehicle.model}`}
                  />
                </TableCell>
                <TableCell className="align-middle font-medium truncate">
                  {vehicle.brand}
                </TableCell>
                <TableCell className="align-middle truncate">
                  {vehicle.model}
                </TableCell>
                <TableCell className="hidden md:table-cell align-middle">
                  {formatMileage(vehicle.mileage)}
                </TableCell>
                <TableCell className="hidden md:table-cell align-middle">
                  {vehicle.licenseNumber}
                </TableCell>
                <TableCell className="hidden sm:table-cell align-middle">
                  {formatPrice(vehicle.sellingPrice)}
                </TableCell>
                <TableCell className="hidden lg:table-cell align-middle truncate">
                  {vehicle.customerName || "Onbekend"}
                </TableCell>
                <TableCell className="hidden xl:table-cell align-middle truncate">
                  {vehicle.salespersonName || "Onbekend"}
                </TableCell>
                <TableCell className="hidden lg:table-cell align-middle">
                  <Badge variant="outline" className={vehicle.salesStatus === "verkocht_b2c" ? "bg-blue-50 text-blue-800" : "bg-purple-50 text-purple-800"}>
                    {vehicle.salesStatus === "verkocht_b2c" ? "B2C" : "B2B"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden xl:table-cell align-middle">
                  {formatDeliveryDate(vehicle.deliveryDate)}
                </TableCell>
                <TableCell className="hidden lg:table-cell align-middle">
                  {vehicle.papersReceived ? (
                    <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center">
                      <FileText className="h-3 w-3 mr-1" />
                      OK
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      Inc.
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
