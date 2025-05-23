
import React, { useState } from "react";
import { Vehicle, ImportStatus, PaymentStatus } from "@/types/inventory";
import { 
  CircleCheck, 
  CircleX, 
  Mail, 
  MoreHorizontal, 
  ArrowUp, 
  ArrowDown, 
  Euro,
  Truck
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { Car } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VehicleB2BTableProps {
  vehicles: Vehicle[];
  selectedVehicles: string[];
  toggleSelectAll: (checked: boolean) => void;
  toggleSelectVehicle: (vehicleId: string, checked: boolean) => void;
  handleSelectVehicle: (vehicle: Vehicle) => void;
  handleSendEmail: (type: string, vehicleId: string) => void;
  handleUpdateSellingPrice?: (vehicleId: string, price: number) => void;
  handleUpdatePaymentStatus?: (vehicleId: string, status: PaymentStatus) => void;
  onMarkAsDelivered?: (vehicleId: string) => void; // New prop for marking as delivered
  isLoading: boolean;
  error: unknown;
  onSort?: (field: string) => void;
  sortField?: string | null;
  sortDirection?: "asc" | "desc";
}

export const renderImportStatusBadge = (status: ImportStatus) => {
  const statusMap: Record<ImportStatus, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
    niet_gestart: { label: "Niet gestart", variant: "outline" },
    aangemeld: { label: "Aangemeld", variant: "outline" },
    goedgekeurd: { label: "Goedgekeurd", variant: "secondary" },
    transport_geregeld: { label: "Transport geregeld", variant: "secondary" },
    onderweg: { label: "Onderweg", variant: "secondary" },
    aangekomen: { label: "Aangekomen", variant: "default" },
    afgemeld: { label: "Afgemeld", variant: "destructive" },
    bpm_betaald: { label: "BPM betaald", variant: "default" },
    herkeuring: { label: "Herkeuring", variant: "secondary" },
    ingeschreven: { label: "Ingeschreven", variant: "default" }
  };
  
  const { label, variant } = statusMap[status];
  
  return <Badge variant={variant}>{label}</Badge>;
};

export const renderPaymentStatusBadge = (status: PaymentStatus) => {
  const statusMap: Record<PaymentStatus, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
    niet_betaald: { label: "Niet betaald", variant: "destructive" },
    aanbetaling: { label: "Aanbetaling", variant: "secondary" },
    volledig_betaald: { label: "Volledig betaald", variant: "default" }
  };
  
  const { label, variant } = statusMap[status];
  
  return <Badge variant={variant}>{label}</Badge>;
};

export const VehicleB2BTable: React.FC<VehicleB2BTableProps> = ({
  vehicles,
  selectedVehicles,
  toggleSelectAll,
  toggleSelectVehicle,
  handleSelectVehicle,
  handleSendEmail,
  handleUpdateSellingPrice,
  handleUpdatePaymentStatus,
  onMarkAsDelivered,
  isLoading,
  error,
  onSort,
  sortField,
  sortDirection
}) => {
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [selectedVehicleForDelivery, setSelectedVehicleForDelivery] = useState<string | null>(null);

  const handleDeliveryConfirm = () => {
    if (selectedVehicleForDelivery && onMarkAsDelivered) {
      onMarkAsDelivered(selectedVehicleForDelivery);
      setSelectedVehicleForDelivery(null);
      setDeliveryDialogOpen(false);
    }
  };

  const openDeliveryDialog = (vehicleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVehicleForDelivery(vehicleId);
    setDeliveryDialogOpen(true);
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    
    return sortDirection === "asc" ? 
      <ArrowUp className="ml-1 h-4 w-4 inline" /> : 
      <ArrowDown className="ml-1 h-4 w-4 inline" />;
  };

  const renderSortableHeader = (field: string, label: string) => {
    return (
      <div 
        className="flex items-center cursor-pointer" 
        onClick={() => onSort && onSort(field)}
      >
        {label} {renderSortIcon(field)}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center">Laden...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">Er is een fout opgetreden bij het laden van de gegevens.</div>;
  }

  if (vehicles.length === 0) {
    return (
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <CustomCheckbox disabled />
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
        <TableBody>
          <TableRow>
            <TableCell colSpan={14} className="h-24 text-center">
              Geen B2B verkochte voertuigen gevonden.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <>
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <CustomCheckbox 
                onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                checked={selectedVehicles.length === vehicles.length && vehicles.length > 0}
                indeterminate={selectedVehicles.length > 0 && selectedVehicles.length < vehicles.length}
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
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow 
              key={vehicle.id}
              className="cursor-pointer hover:bg-muted"
              onClick={() => handleSelectVehicle(vehicle)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <CustomCheckbox 
                  checked={selectedVehicles.includes(vehicle.id)}
                  onCheckedChange={(checked) => toggleSelectVehicle(vehicle.id, !!checked)}
                />
              </TableCell>
              <TableCell>
                {vehicle.mainPhotoUrl ? (
                  <Avatar className="w-12 h-12 rounded-md">
                    <img 
                      src={vehicle.mainPhotoUrl} 
                      alt={`${vehicle.brand} ${vehicle.model}`} 
                      className="object-cover w-full h-full rounded-md"
                    />
                  </Avatar>
                ) : (
                  <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                    <Car className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{vehicle.brand}</TableCell>
              <TableCell>{vehicle.model}</TableCell>
              <TableCell>{vehicle.mileage.toLocaleString('nl-NL')} km</TableCell>
              <TableCell>{vehicle.licenseNumber}</TableCell>
              <TableCell>{vehicle.vin}</TableCell>
              <TableCell className="font-medium">
                {vehicle.purchasePrice ? `€ ${vehicle.purchasePrice.toLocaleString('nl-NL')}` : '-'}
              </TableCell>
              <TableCell>
                {vehicle.sellingPrice ? (
                  <span className="font-medium">€ {vehicle.sellingPrice.toLocaleString('nl-NL')}</span>
                ) : (
                  <span className="text-muted-foreground">Niet ingesteld</span>
                )}
              </TableCell>
              <TableCell>{renderImportStatusBadge(vehicle.importStatus)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {vehicle.location}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {vehicle.papersReceived ? (
                  <CircleCheck className="h-5 w-5 text-green-500 mx-auto" />
                ) : (
                  <CircleX className="h-5 w-5 text-red-500 mx-auto" />
                )}
              </TableCell>
              <TableCell>
                {renderPaymentStatusBadge(vehicle.paymentStatus || "niet_betaald")}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="float-right"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Snelle acties</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleSelectVehicle(vehicle);
                    }}>
                      Details bekijken
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleSendEmail("contract_b2b", vehicle.id);
                    }}>
                      <Mail className="h-4 w-4 mr-2" />
                      Koopcontract sturen
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleSendEmail("vehicle_arrived", vehicle.id);
                    }}>
                      <Mail className="h-4 w-4 mr-2" />
                      Auto is binnengekomen
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleSendEmail("license_registration", vehicle.id);
                    }}>
                      <Mail className="h-4 w-4 mr-2" />
                      Kenteken update
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Betaalstatus</DropdownMenuLabel>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleUpdatePaymentStatus && handleUpdatePaymentStatus(vehicle.id, "niet_betaald");
                    }}>
                      Niet betaald
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleUpdatePaymentStatus && handleUpdatePaymentStatus(vehicle.id, "aanbetaling");
                    }}>
                      Aanbetaling
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleUpdatePaymentStatus && handleUpdatePaymentStatus(vehicle.id, "volledig_betaald");
                    }}>
                      Volledig betaald
                    </DropdownMenuItem>
                    
                    {/* Add the Afgeleverd option only for fully paid vehicles */}
                    {vehicle.paymentStatus === "volledig_betaald" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => openDeliveryDialog(vehicle.id, e)}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Afgeleverd
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Confirmation Dialog for Marking as Delivered */}
      <AlertDialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voertuig afgeleverd</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u dit voertuig als afgeleverd wilt markeren? 
              Het voertuig wordt verwijderd uit de B2B lijst.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeliveryConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              Afgeleverd
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
