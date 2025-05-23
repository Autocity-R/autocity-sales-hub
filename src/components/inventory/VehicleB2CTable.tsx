
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronUp, ChevronDown, MoreHorizontal, Mail, Car, CircleCheck } from "lucide-react";
import { Vehicle, PaymentStatus, PaintStatus } from "@/types/inventory";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";

interface VehicleB2CTableProps {
  vehicles: Vehicle[];
  selectedVehicles: string[];
  toggleSelectAll: (checked: boolean) => void;
  toggleSelectVehicle: (id: string, checked: boolean) => void;
  handleSelectVehicle: (vehicle: Vehicle) => void;
  handleSendEmail: (type: string, vehicleId: string) => void;
  handleUpdateSellingPrice: (vehicleId: string, price: number) => void;
  handleUpdatePaymentStatus: (vehicleId: string, status: PaymentStatus) => void;
  handleUpdatePaintStatus: (vehicleId: string, status: PaintStatus) => void;
  onMarkAsDelivered: (vehicleId: string) => void;
  handleChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  isLoading: boolean;
  error: unknown;
  onSort: (field: string) => void;
  sortField: string | null;
  sortDirection: "asc" | "desc";
}

export const VehicleB2CTable: React.FC<VehicleB2CTableProps> = ({
  vehicles,
  selectedVehicles,
  toggleSelectAll,
  toggleSelectVehicle,
  handleSelectVehicle,
  handleSendEmail,
  handleUpdateSellingPrice,
  handleUpdatePaymentStatus,
  handleUpdatePaintStatus,
  onMarkAsDelivered,
  handleChangeStatus,
  isLoading,
  error,
  onSort,
  sortField,
  sortDirection
}) => {
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = React.useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string | null>(null);

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const handleSort = (field: string) => {
    onSort(field);
  };

  const handleDeliveryConfirm = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setDeliveryConfirmOpen(true);
  };

  const confirmDelivery = () => {
    if (selectedVehicleId) {
      onMarkAsDelivered(selectedVehicleId);
      setDeliveryConfirmOpen(false);
      setSelectedVehicleId(null);
    }
  };

  const renderImportStatus = (status: string) => {
    switch (status) {
      case "niet_gestart":
        return <Badge variant="outline" className="bg-gray-100">Niet gestart</Badge>;
      case "aangemeld":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Aangemeld</Badge>;
      case "goedgekeurd":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Goedgekeurd</Badge>;
      case "bpm_betaald":
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">BPM Betaald</Badge>;
      case "herkeuring":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Herkeuring</Badge>;
      case "ingeschreven":
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Ingeschreven</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderWorkshopStatus = (status: string) => {
    switch (status) {
      case "wachten":
        return <Badge variant="outline" className="bg-gray-100">Wachten</Badge>;
      case "poetsen":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Poetsen</Badge>;
      case "spuiten":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Spuiten</Badge>;
      case "gereed":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Gereed</Badge>;
      case "klaar_voor_aflevering":
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Klaar voor aflevering</Badge>;
      case "in_werkplaats":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">In werkplaats</Badge>;
      case "wacht_op_onderdelen":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Wacht op onderdelen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderPaintStatus = (status?: string) => {
    switch (status) {
      case "geen_behandeling":
        return <Badge variant="outline" className="bg-gray-100">Geen behandeling</Badge>;
      case "hersteld":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Hersteld</Badge>;
      case "in_behandeling":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">In behandeling</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const renderLocationStatus = (status: string) => {
    switch (status) {
      case "showroom":
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Showroom</Badge>;
      case "opslag":
        return <Badge variant="outline" className="bg-gray-100">Opslag</Badge>;
      case "werkplaats":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Werkplaats</Badge>;
      case "poetser":
        return <Badge variant="outline" className="bg-cyan-100 text-cyan-800">Poetser</Badge>;
      case "spuiter":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Spuiter</Badge>;
      case "onderweg":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Onderweg</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
    <>
      <div className="w-full overflow-x-auto">
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
              <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort("brand")}>
                <div className="flex items-center">
                  Merk
                  {renderSortIcon("brand")}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort("model")}>
                <div className="flex items-center">
                  Model
                  {renderSortIcon("model")}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort("mileage")}>
                <div className="flex items-center">
                  Kilometerstand
                  {renderSortIcon("mileage")}
                </div>
              </TableHead>
              <TableHead className="whitespace-nowrap">
                <div className="flex items-center">
                  VIN
                </div>
              </TableHead>
              <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort("purchasePrice")}>
                <div className="flex items-center">
                  Inkoop prijs
                  {renderSortIcon("purchasePrice")}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer whitespace-nowrap" onClick={() => handleSort("sellingPrice")}>
                <div className="flex items-center">
                  Verkoopprijs
                  {renderSortIcon("sellingPrice")}
                </div>
              </TableHead>
              <TableHead className="whitespace-nowrap">
                <div className="flex items-center">
                  Klantnaam
                </div>
              </TableHead>
              <TableHead className="whitespace-nowrap">
                <div className="flex items-center">
                  Import status
                </div>
              </TableHead>
              <TableHead className="whitespace-nowrap">
                <div className="flex items-center">
                  Werkplaats status
                </div>
              </TableHead>
              <TableHead className="whitespace-nowrap">
                <div className="flex items-center">
                  Lak status
                </div>
              </TableHead>
              <TableHead className="whitespace-nowrap">
                <div className="flex items-center">
                  Locatie
                </div>
              </TableHead>
              <TableHead className="w-12 text-center"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                  Geen voertuigen gevonden
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((vehicle) => (
                <ContextMenu key={vehicle.id}>
                  <ContextMenuTrigger>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedVehicles.includes(vehicle.id)} 
                          onCheckedChange={(checked) => toggleSelectVehicle(vehicle.id, checked === true)} 
                          aria-label={`Selecteer ${vehicle.brand} ${vehicle.model}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium" onClick={() => handleSelectVehicle(vehicle)}>
                        {vehicle.brand}
                      </TableCell>
                      <TableCell onClick={() => handleSelectVehicle(vehicle)}>
                        {vehicle.model}
                      </TableCell>
                      <TableCell onClick={() => handleSelectVehicle(vehicle)}>
                        {vehicle.mileage.toLocaleString()} km
                      </TableCell>
                      <TableCell className="whitespace-nowrap" onClick={() => handleSelectVehicle(vehicle)}>
                        {vehicle.vin}
                      </TableCell>
                      <TableCell className="font-medium" onClick={() => handleSelectVehicle(vehicle)}>
                        {vehicle.purchasePrice ? `€ ${vehicle.purchasePrice.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="font-medium" onClick={() => handleSelectVehicle(vehicle)}>
                        € {vehicle.sellingPrice.toLocaleString()}
                      </TableCell>
                      <TableCell onClick={() => handleSelectVehicle(vehicle)}>
                        {vehicle.customerName || "Onbekend"}
                      </TableCell>
                      <TableCell onClick={() => handleSelectVehicle(vehicle)}>
                        {renderImportStatus(vehicle.importStatus)}
                      </TableCell>
                      <TableCell onClick={() => handleSelectVehicle(vehicle)}>
                        {renderWorkshopStatus(vehicle.workshopStatus)}
                      </TableCell>
                      <TableCell onClick={() => handleSelectVehicle(vehicle)}>
                        {renderPaintStatus(vehicle.paintStatus)}
                      </TableCell>
                      <TableCell onClick={() => handleSelectVehicle(vehicle)}>
                        {renderLocationStatus(vehicle.location)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSendEmail("contract_b2c", vehicle.id)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Stuur koopcontract
                            </DropdownMenuItem>
                            
                            {handleChangeStatus && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Verkoopstatus</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleChangeStatus(vehicle.id, "verkocht_b2b")}>
                                  Verkocht B2B
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangeStatus(vehicle.id, "verkocht_b2c")}>
                                  Verkocht Particulier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangeStatus(vehicle.id, "voorraad")}>
                                  Terug naar voorraad
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {vehicle.paymentStatus === "volledig_betaald" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeliveryConfirm(vehicle.id)}>
                                  <Car className="h-4 w-4 mr-2" />
                                  Auto afgeleverd
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56 bg-popover border shadow-md z-50">
                    <ContextMenuItem onClick={() => handleSelectVehicle(vehicle)}>
                      Bekijk details
                    </ContextMenuItem>
                    
                    {handleChangeStatus && (
                      <>
                        <ContextMenuItem onClick={() => handleChangeStatus(vehicle.id, "verkocht_b2b")}>
                          Markeer als verkocht B2B
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => handleChangeStatus(vehicle.id, "verkocht_b2c")}>
                          Markeer als verkocht particulier
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => handleChangeStatus(vehicle.id, "voorraad")}>
                          Zet terug naar voorraad
                        </ContextMenuItem>
                      </>
                    )}
                    
                    {vehicle.paymentStatus === "volledig_betaald" && (
                      <ContextMenuItem onClick={() => handleDeliveryConfirm(vehicle.id)}>
                        <CircleCheck className="h-4 w-4 mr-2" />
                        Markeer als afgeleverd
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deliveryConfirmOpen} onOpenChange={setDeliveryConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voertuig afgeleverd markeren?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u dit voertuig als afgeleverd wilt markeren? 
              Het voertuig wordt verplaatst naar de 'Afgeleverd' sectie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelivery}>Ja, markeer als afgeleverd</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
