
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
    <TableHeader className="bg-muted/50 sticky top-0 z-20">
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-[50px] px-3 sticky left-0 z-10 bg-muted/50">
          <CustomCheckbox 
            checked={isAllSelected}
            indeterminate={isIndeterminate}
            onCheckedChange={toggleSelectAll} 
            aria-label="Selecteer alle voertuigen"
          />
        </TableHead>
        <TableHead className="w-[60px] px-3">Foto</TableHead>
        <TableHead className="min-w-[110px] px-3">
          {renderSortableHeader("brand", "Merk")}
        </TableHead>
        <TableHead className="min-w-[140px] px-3">
          {renderSortableHeader("model", "Model")}
        </TableHead>
        <TableHead className="min-w-[70px] px-3">
          {renderSortableHeader("year", "Jaar")}
        </TableHead>
        <TableHead className="min-w-[130px] px-3">
          {renderSortableHeader("mileage", "KM")}
        </TableHead>
        <TableHead className="min-w-[180px] px-3">
          {renderSortableHeader("vin", "VIN")}
        </TableHead>
        <TableHead className="min-w-[120px] px-3">
          {renderSortableHeader("purchasePrice", "Inkoop")}
        </TableHead>
        <TableHead className="min-w-[120px] px-3">
          {renderSortableHeader("sellingPrice", "Verkoop")}
        </TableHead>
        <TableHead className="min-w-[150px] px-3">
          {renderSortableHeader("customerName", "Klant")}
        </TableHead>
        <TableHead className="min-w-[140px] px-3">
          {renderSortableHeader("importStatus", "Import")}
        </TableHead>
        <TableHead className="min-w-[150px] px-3">
          {renderSortableHeader("workshopStatus", "Werkplaats")}
        </TableHead>
        <TableHead className="min-w-[120px] px-3">
          {renderSortableHeader("paintStatus", "Lak")}
        </TableHead>
        <TableHead className="min-w-[100px] px-3">
          {renderSortableHeader("location", "Locatie")}
        </TableHead>
        <TableHead className="w-[80px] px-3 sticky right-0 z-10 bg-muted/50">Acties</TableHead>
      </TableRow>
    </TableHeader>
  );
};
