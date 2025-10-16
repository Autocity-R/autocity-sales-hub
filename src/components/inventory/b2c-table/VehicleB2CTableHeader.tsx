
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
        <TableHead className="sticky left-0 z-10 bg-muted w-16 lg:w-20 px-4 lg:px-5 xl:px-6">
          <CustomCheckbox 
            checked={isAllSelected}
            indeterminate={isIndeterminate}
            onCheckedChange={toggleSelectAll} 
            aria-label="Selecteer alle voertuigen"
          />
        </TableHead>
        <TableHead className="sticky left-16 lg:left-20 z-10 bg-muted w-20 lg:w-24 xl:w-28 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">Foto</TableHead>
        <TableHead className="sticky left-36 lg:left-44 xl:left-48 z-10 bg-muted min-w-32 lg:min-w-40 xl:min-w-48 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">
          {renderSortableHeader("brand", "Merk")}
        </TableHead>
        <TableHead className="min-w-32 lg:min-w-40 xl:min-w-48 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">
          {renderSortableHeader("model", "Model")}
        </TableHead>
        <TableHead className="min-w-20 lg:min-w-24 xl:min-w-28 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">
          {renderSortableHeader("year", "Jaar")}
        </TableHead>
        <TableHead className="min-w-32 lg:min-w-40 xl:min-w-48 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">
          {renderSortableHeader("mileage", "Kilometerstand")}
        </TableHead>
        <TableHead className="min-w-40 lg:min-w-48 xl:min-w-56 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">
          {renderSortableHeader("vin", "VIN")}
        </TableHead>
        <TableHead className="min-w-36 lg:min-w-44 xl:min-w-52 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">
          {renderSortableHeader("purchasePrice", "Inkoop prijs")}
        </TableHead>
        <TableHead className="min-w-36 lg:min-w-44 xl:min-w-52 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">
          {renderSortableHeader("sellingPrice", "Verkoopprijs")}
        </TableHead>
        <TableHead className="min-w-36 lg:min-w-44 xl:min-w-52 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">
          {renderSortableHeader("customerName", "Klantnaam")}
        </TableHead>
        <TableHead className="min-w-40 lg:min-w-48 xl:min-w-56 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">
          {renderSortableHeader("importStatus", "Import status")}
        </TableHead>
        <TableHead className="min-w-44 lg:min-w-52 xl:min-w-60 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">
          {renderSortableHeader("workshopStatus", "Werkplaats status")}
        </TableHead>
        <TableHead className="min-w-32 lg:min-w-40 xl:min-w-48 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">
          {renderSortableHeader("paintStatus", "Lak status")}
        </TableHead>
        <TableHead className="min-w-28 lg:min-w-36 xl:min-w-40 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">
          {renderSortableHeader("location", "Locatie")}
        </TableHead>
        <TableHead className="sticky right-0 z-10 bg-muted w-16 lg:w-20 px-4 lg:px-5 xl:px-6 text-sm lg:text-base xl:text-lg">Acties</TableHead>
      </TableRow>
    </TableHeader>
  );
};
