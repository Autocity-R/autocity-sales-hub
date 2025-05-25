
import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { ArrowUp, ArrowDown } from "lucide-react";

interface VehicleB2CTableHeaderProps {
  selectedVehicles: string[];
  vehiclesLength: number;
  toggleSelectAll: (checked: boolean) => void;
  onSort: (field: string) => void;
  sortField: string | null;
  sortDirection: "asc" | "desc";
}

export const VehicleB2CTableHeader: React.FC<VehicleB2CTableHeaderProps> = ({
  selectedVehicles,
  vehiclesLength,
  toggleSelectAll,
  onSort,
  sortField,
  sortDirection
}) => {
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const handleSort = (field: string) => {
    onSort(field);
  };

  const renderSortableHeader = (field: string, label: string) => {
    return (
      <div 
        className="flex items-center cursor-pointer" 
        onClick={() => handleSort(field)}
      >
        {label} {renderSortIcon(field)}
      </div>
    );
  };

  const isAllSelected = selectedVehicles.length === vehiclesLength && vehiclesLength > 0;
  const isIndeterminate = selectedVehicles.length > 0 && selectedVehicles.length < vehiclesLength;

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12">
          <CustomCheckbox 
            checked={isAllSelected}
            indeterminate={isIndeterminate}
            onCheckedChange={toggleSelectAll} 
            aria-label="Selecteer alle voertuigen"
          />
        </TableHead>
        <TableHead className="w-16">Foto</TableHead>
        <TableHead className="min-w-20">
          {renderSortableHeader("brand", "Merk")}
        </TableHead>
        <TableHead className="min-w-24">
          {renderSortableHeader("model", "Model")}
        </TableHead>
        <TableHead className="hidden md:table-cell min-w-20">
          {renderSortableHeader("mileage", "KM")}
        </TableHead>
        <TableHead className="hidden md:table-cell min-w-28">
          {renderSortableHeader("licenseNumber", "Kenteken")}
        </TableHead>
        <TableHead className="hidden lg:table-cell min-w-32">
          {renderSortableHeader("vin", "VIN")}
        </TableHead>
        <TableHead className="hidden xl:table-cell">
          {renderSortableHeader("purchasePrice", "Inkoop")}
        </TableHead>
        <TableHead className="hidden sm:table-cell">
          {renderSortableHeader("sellingPrice", "Verkoop")}
        </TableHead>
        <TableHead className="hidden lg:table-cell min-w-24">
          {renderSortableHeader("customerName", "Klant")}
        </TableHead>
        <TableHead className="hidden xl:table-cell">
          {renderSortableHeader("salespersonName", "Verkoper")}
        </TableHead>
        <TableHead className="hidden xl:table-cell min-w-32">
          {renderSortableHeader("importStatus", "Import")}
        </TableHead>
        <TableHead className="hidden xl:table-cell">
          {renderSortableHeader("location", "Locatie")}
        </TableHead>
        <TableHead className="hidden lg:table-cell text-center w-20">
          {renderSortableHeader("papersReceived", "Pap.")}
        </TableHead>
        <TableHead className="hidden sm:table-cell">
          {renderSortableHeader("paymentStatus", "Status")}
        </TableHead>
        <TableHead className="w-12"></TableHead>
      </TableRow>
    </TableHeader>
  );
};
