
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, MoreHorizontal, Mail, Euro, Truck } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Vehicle } from "@/types/inventory";

interface VehicleTableProps {
  vehicles: Vehicle[];
  selectedVehicles: string[];
  toggleSelectAll: (checked: boolean) => void;
  toggleSelectVehicle: (id: string, checked: boolean) => void;
  handleSelectVehicle: (vehicle: Vehicle) => void;
  handleSendEmail: (type: string, vehicleId: string) => void;
  handleChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  handleMarkAsDelivered?: (vehicleId: string) => void;
  isLoading: boolean;
  error: unknown;
  onSort: (field: string) => void;
  sortField: string | null;
  sortDirection: "asc" | "desc";
}

export const VehicleTable: React.FC<VehicleTableProps> = ({
  vehicles,
  selectedVehicles,
  toggleSelectAll,
  toggleSelectVehicle,
  handleSelectVehicle,
  handleSendEmail,
  handleChangeStatus,
  handleMarkAsDelivered,
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

  const formatPrice = (price: number | undefined) => {
    if (!price) return "€ -";
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price);
  };

  const formatMileage = (mileage: number | undefined) => {
    if (!mileage) return "- km";
    return new Intl.NumberFormat('nl-NL').format(mileage) + " km";
  };

  if (isLoading) {
    return <div className="p-4 text-center">Laden...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Fout bij het laden van voertuigen</div>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full min-w-[1200px]">
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
            <TableHead className="min-w-20 cursor-pointer" onClick={() => handleSort("mileage")}>
              <div className="flex items-center">
                KM
                {renderSortIcon("mileage")}
              </div>
            </TableHead>
            <TableHead className="min-w-28 cursor-pointer" onClick={() => handleSort("licenseNumber")}>
              <div className="flex items-center">
                Kenteken
                {renderSortIcon("licenseNumber")}
              </div>
            </TableHead>
            <TableHead className="min-w-32 cursor-pointer" onClick={() => handleSort("vin")}>
              <div className="flex items-center">
                VIN
                {renderSortIcon("vin")}
              </div>
            </TableHead>
            <TableHead className="min-w-28 cursor-pointer" onClick={() => handleSort("purchasePrice")}>
              <div className="flex items-center">
                Inkoopprijs
                {renderSortIcon("purchasePrice")}
              </div>
            </TableHead>
            <TableHead className="min-w-28 cursor-pointer" onClick={() => handleSort("sellingPrice")}>
              <div className="flex items-center">
                Verkoopprijs
                {renderSortIcon("sellingPrice")}
              </div>
            </TableHead>
            <TableHead className="min-w-24 cursor-pointer" onClick={() => handleSort("location")}>
              <div className="flex items-center">
                Locatie
                {renderSortIcon("location")}
              </div>
            </TableHead>
            <TableHead className="min-w-20">
              Status
            </TableHead>
            <TableHead className="w-12">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                Geen voertuigen gevonden
              </TableCell>
            </TableRow>
          ) : (
            vehicles.map((vehicle) => (
              <TableRow 
                key={vehicle.id} 
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => handleSelectVehicle(vehicle)}
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
                <TableCell className="align-middle">
                  {formatMileage(vehicle.mileage)}
                </TableCell>
                <TableCell className="align-middle">
                  {vehicle.licenseNumber}
                </TableCell>
                <TableCell className="align-middle truncate max-w-32">
                  {vehicle.vin}
                </TableCell>
                <TableCell className="align-middle">
                  {formatPrice(vehicle.purchasePrice)}
                </TableCell>
                <TableCell className="align-middle">
                  {formatPrice(vehicle.sellingPrice)}
                </TableCell>
                <TableCell className="align-middle">
                  <Badge variant="outline" className="capitalize">
                    {vehicle.location}
                  </Badge>
                </TableCell>
                <TableCell className="align-middle">
                  <Badge variant="default">
                    Beschikbaar
                  </Badge>
                </TableCell>
                <TableCell className="align-middle" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Acties</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleSendEmail("inquiry", vehicle.id)}>
                        <Mail className="h-4 w-4 mr-2" />
                        E-mail sturen
                      </DropdownMenuItem>
                      {handleChangeStatus && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleChangeStatus(vehicle.id, "verkocht_b2c")}>
                            Verkocht B2C
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeStatus(vehicle.id, "verkocht_b2b")}>
                            Verkocht B2B
                          </DropdownMenuItem>
                        </>
                      )}
                      {handleMarkAsDelivered && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleMarkAsDelivered(vehicle.id)}>
                            <Truck className="h-4 w-4 mr-2" />
                            Afgeleverd
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
