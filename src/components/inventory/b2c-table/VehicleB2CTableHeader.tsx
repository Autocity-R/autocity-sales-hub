
import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronUp, ChevronDown } from "lucide-react";

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
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const handleSort = (field: string) => {
    onSort(field);
  };

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12">
          <Checkbox 
            checked={selectedVehicles.length === vehiclesLength && vehiclesLength > 0} 
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
        <TableHead className="cursor-pointer" onClick={() => handleSort("mileage")}>
          <div className="flex items-center">
            Kilometerstand
            {renderSortIcon("mileage")}
          </div>
        </TableHead>
        <TableHead>
          <div className="flex items-center">
            VIN
          </div>
        </TableHead>
        <TableHead className="cursor-pointer" onClick={() => handleSort("purchasePrice")}>
          <div className="flex items-center">
            Inkoop prijs
            {renderSortIcon("purchasePrice")}
          </div>
        </TableHead>
        <TableHead className="cursor-pointer" onClick={() => handleSort("sellingPrice")}>
          <div className="flex items-center">
            Verkoopprijs
            {renderSortIcon("sellingPrice")}
          </div>
        </TableHead>
        <TableHead>
          <div className="flex items-center">
            Klantnaam
          </div>
        </TableHead>
        <TableHead>
          <div className="flex items-center">
            Import status
          </div>
        </TableHead>
        <TableHead>
          <div className="flex items-center">
            Werkplaats status
          </div>
        </TableHead>
        <TableHead>
          <div className="flex items-center">
            Lak status
          </div>
        </TableHead>
        <TableHead>
          <div className="flex items-center">
            Locatie
          </div>
        </TableHead>
        <TableHead className="w-12 text-center">
          <div className="flex items-center justify-center">
            Acties
          </div>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};
