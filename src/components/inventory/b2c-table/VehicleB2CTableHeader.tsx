
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
    <TableHeader className="sticky top-0 z-10 bg-background">
      <TableRow>
        <TableHead className="w-12 sticky left-0 z-10 bg-background">
          <CustomCheckbox 
            checked={isAllSelected}
            indeterminate={isIndeterminate}
            onCheckedChange={toggleSelectAll} 
            aria-label="Selecteer alle voertuigen"
          />
        </TableHead>
        <TableHead className="w-[72px] sticky left-12 z-10 bg-background">Foto</TableHead>
        <TableHead className="min-w-20">
          {renderSortableHeader("brand", "Merk")}
        </TableHead>
        <TableHead className="min-w-24">
          {renderSortableHeader("model", "Model")}
        </TableHead>
        <TableHead className="hidden md:table-cell w-[80px] text-right">
          {renderSortableHeader("year", "Jaar")}
        </TableHead>
        <TableHead className="hidden lg:table-cell w-[120px] text-right">
          {renderSortableHeader("mileage", "Kilometerstand")}
        </TableHead>
        <TableHead className="hidden xl:table-cell min-w-[180px]">
          {renderSortableHeader("vin", "VIN")}
        </TableHead>
        <TableHead className="min-w-28">
          {renderSortableHeader("purchasePrice", "Inkoop prijs")}
        </TableHead>
        <TableHead className="w-[120px] text-right">
          {renderSortableHeader("sellingPrice", "Verkoopprijs")}
        </TableHead>
        <TableHead className="min-w-24">
          {renderSortableHeader("customerName", "Klantnaam")}
        </TableHead>
        <TableHead className="min-w-32">
          {renderSortableHeader("importStatus", "Import status")}
        </TableHead>
        <TableHead className="min-w-32">
          {renderSortableHeader("workshopStatus", "Werkplaats status")}
        </TableHead>
        <TableHead className="min-w-24">
          {renderSortableHeader("paintStatus", "Lak status")}
        </TableHead>
        <TableHead className="min-w-24">
          {renderSortableHeader("location", "Locatie")}
        </TableHead>
        <TableHead className="w-[96px] sticky right-0 z-10 bg-background">Acties</TableHead>
      </TableRow>
    </TableHeader>
  );
};
