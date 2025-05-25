
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
        <TableHead className="w-4 px-2">
          <CustomCheckbox 
            checked={isAllSelected}
            indeterminate={isIndeterminate}
            onCheckedChange={toggleSelectAll} 
            aria-label="Selecteer alle voertuigen"
          />
        </TableHead>
        <TableHead className="w-[70px]">Foto</TableHead>
        <TableHead>
          {renderSortableHeader("brand", "Merk")}
        </TableHead>
        <TableHead>
          {renderSortableHeader("model", "Model")}
        </TableHead>
        <TableHead>
          {renderSortableHeader("mileage", "KM Stand")}
        </TableHead>
        <TableHead>
          {renderSortableHeader("licenseNumber", "Kenteken")}
        </TableHead>
        <TableHead>
          {renderSortableHeader("vin", "VIN")}
        </TableHead>
        <TableHead>
          {renderSortableHeader("purchasePrice", "Inkoop prijs")}
        </TableHead>
        <TableHead>
          {renderSortableHeader("sellingPrice", "Verkoopprijs")}
        </TableHead>
        <TableHead>
          {renderSortableHeader("customerName", "Klant")}
        </TableHead>
        <TableHead>
          {renderSortableHeader("salespersonName", "Verkoper")}
        </TableHead>
        <TableHead>
          {renderSortableHeader("importStatus", "Importstatus")}
        </TableHead>
        <TableHead>
          {renderSortableHeader("location", "Locatie")}
        </TableHead>
        <TableHead className="text-center">
          {renderSortableHeader("papersReceived", "Papieren")}
        </TableHead>
        <TableHead>
          {renderSortableHeader("paymentStatus", "Betaalstatus")}
        </TableHead>
        <TableHead></TableHead>
      </TableRow>
    </TableHeader>
  );
};
