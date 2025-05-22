
import React from "react";
import { Vehicle, ImportStatus } from "@/types/inventory";
import { CircleCheck, CircleX, ExternalLink, Mail, MoreHorizontal, ArrowUp, ArrowDown } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { Car } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface VehicleTableProps {
  vehicles: Vehicle[];
  selectedVehicles: string[];
  toggleSelectAll: (checked: boolean) => void;
  toggleSelectVehicle: (vehicleId: string, checked: boolean) => void;
  handleSelectVehicle: (vehicle: Vehicle) => void;
  handleSendEmail: (type: string, vehicleId: string) => void;
  handleChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  handleDeleteVehicle?: (vehicleId: string) => void;
  isLoading: boolean;
  error: unknown;
  onSort?: (field: string) => void;
  sortField?: string | null;
  sortDirection?: "asc" | "desc";
}

export const renderImportStatusBadge = (status: ImportStatus) => {
  const statusMap: Record<ImportStatus, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
    niet_gestart: { label: "Niet gestart", variant: "outline" },
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

// Helper to calculate stay days
const calculateStaDagen = (createdAt: Date | string | undefined): number => {
  if (!createdAt) return 0;
  const now = new Date();
  const created = new Date(createdAt);
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 3600 * 24));
};

export const VehicleTable: React.FC<VehicleTableProps> = ({
  vehicles,
  selectedVehicles,
  toggleSelectAll,
  toggleSelectVehicle,
  handleSelectVehicle,
  handleSendEmail,
  handleChangeStatus,
  handleDeleteVehicle,
  isLoading,
  error,
  onSort,
  sortField,
  sortDirection
}) => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"transport_pickup" | "cmr_supplier" | "verkocht_b2c" | "verkocht_b2b">();
  const [currentVehicleId, setCurrentVehicleId] = useState<string>("");
  const [selectedTransporter, setSelectedTransporter] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [selectedB2BCustomer, setSelectedB2BCustomer] = useState<string>("");
  const [newB2BCustomer, setNewB2BCustomer] = useState({name: "", email: "", phone: ""});
  const [selectedB2CCustomer, setSelectedB2CCustomer] = useState({name: "", email: "", phone: ""});
  
  // Mock data for the selectors - in a real application, these would come from the API
  const transporters = ["Transport A", "Transport B", "Transport C"];
  const suppliers = ["Supplier X", "Supplier Y", "Supplier Z"];
  const b2bCustomers = ["Company A", "Company B", "Company C"];

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

  const handleEmailClick = (type: "transport_pickup" | "cmr_supplier", vehicleId: string) => {
    setCurrentVehicleId(vehicleId);
    setDialogType(type);
    setDialogOpen(true);
  };

  const handleStatusChange = (status: "verkocht_b2b" | "verkocht_b2c", vehicleId: string) => {
    setCurrentVehicleId(vehicleId);
    setDialogType(status);
    setDialogOpen(true);
  };

  const handleDialogConfirm = () => {
    if (!dialogType || !currentVehicleId) return;
    
    // Handle different dialog confirmations
    switch(dialogType) {
      case "transport_pickup":
        if (!selectedTransporter) {
          toast({
            title: "Transporteur ontbreekt",
            description: "Selecteer eerst een transporteur.",
            variant: "destructive"
          });
          return;
        }
        // Send email with transporter info
        handleSendEmail("transport_pickup", currentVehicleId);
        break;
        
      case "cmr_supplier":
        if (!selectedSupplier) {
          toast({
            title: "Leverancier ontbreekt",
            description: "Selecteer eerst een leverancier.",
            variant: "destructive"
          });
          return;
        }
        // Send email with supplier info
        handleSendEmail("cmr_supplier", currentVehicleId);
        break;
        
      case "verkocht_b2c":
        if (!selectedB2CCustomer.name || !selectedB2CCustomer.email) {
          toast({
            title: "Klantgegevens ontbreken",
            description: "Vul alle verplichte velden in.",
            variant: "destructive"
          });
          return;
        }
        // Update vehicle status to B2C with customer info
        if (handleChangeStatus) {
          handleChangeStatus(currentVehicleId, "verkocht_b2c");
        }
        break;
        
      case "verkocht_b2b":
        if (!selectedB2BCustomer && (!newB2BCustomer.name || !newB2BCustomer.email)) {
          toast({
            title: "B2B klant ontbreekt",
            description: "Selecteer een bestaande klant of maak een nieuwe aan.",
            variant: "destructive"
          });
          return;
        }
        // Update vehicle status to B2B with customer info
        if (handleChangeStatus) {
          handleChangeStatus(currentVehicleId, "verkocht_b2b");
        }
        break;
    }
    
    // Reset state and close dialog
    setDialogOpen(false);
    setSelectedTransporter("");
    setSelectedSupplier("");
    setSelectedB2BCustomer("");
    setNewB2BCustomer({name: "", email: "", phone: ""});
    setSelectedB2CCustomer({name: "", email: "", phone: ""});
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
            <TableHead className="w-[100px]">
              {renderSortableHeader("brand", "Merk")}
            </TableHead>
            <TableHead>
              {renderSortableHeader("model", "Model")}
            </TableHead>
            <TableHead className="w-[120px]">
              {renderSortableHeader("licenseNumber", "Kenteken")}
            </TableHead>
            <TableHead>
              {renderSortableHeader("vin", "VIN")}
            </TableHead>
            <TableHead>
              {renderSortableHeader("mileage", "KM Stand")}
            </TableHead>
            <TableHead className="w-[150px]">
              {renderSortableHeader("importStatus", "Importstatus")}
            </TableHead>
            <TableHead>
              {renderSortableHeader("location", "Locatie")}
            </TableHead>
            <TableHead className="text-center">
              {renderSortableHeader("arrived", "Aangekomen")}
            </TableHead>
            <TableHead className="text-center">
              {renderSortableHeader("papersReceived", "Papieren")}
            </TableHead>
            <TableHead className="text-center">
              {renderSortableHeader("showroomOnline", "Online")}
            </TableHead>
            <TableHead className="text-center w-[90px]">
              {renderSortableHeader("staDagen", "Stadagen")}
            </TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={14} className="h-24 text-center">
              Geen voertuigen gevonden.
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
            <TableHead className="w-[100px]">
              {renderSortableHeader("brand", "Merk")}
            </TableHead>
            <TableHead>
              {renderSortableHeader("model", "Model")}
            </TableHead>
            <TableHead className="w-[120px]">
              {renderSortableHeader("licenseNumber", "Kenteken")}
            </TableHead>
            <TableHead>
              {renderSortableHeader("vin", "VIN")}
            </TableHead>
            <TableHead>
              {renderSortableHeader("mileage", "KM Stand")}
            </TableHead>
            <TableHead className="w-[150px]">
              {renderSortableHeader("importStatus", "Importstatus")}
            </TableHead>
            <TableHead>
              {renderSortableHeader("location", "Locatie")}
            </TableHead>
            <TableHead className="text-center">
              {renderSortableHeader("arrived", "Aangekomen")}
            </TableHead>
            <TableHead className="text-center">
              {renderSortableHeader("papersReceived", "Papieren")}
            </TableHead>
            <TableHead className="text-center">
              {renderSortableHeader("showroomOnline", "Online")}
            </TableHead>
            <TableHead className="text-center w-[90px]">
              {renderSortableHeader("staDagen", "Stadagen")}
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
              <TableCell>{vehicle.licenseNumber}</TableCell>
              <TableCell>{vehicle.vin}</TableCell>
              <TableCell>{vehicle.mileage.toLocaleString('nl-NL')} km</TableCell>
              <TableCell>{renderImportStatusBadge(vehicle.importStatus)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {vehicle.location}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {vehicle.arrived ? (
                  <CircleCheck className="h-5 w-5 text-green-500 mx-auto" />
                ) : (
                  <CircleX className="h-5 w-5 text-red-500 mx-auto" />
                )}
              </TableCell>
              <TableCell className="text-center">
                {vehicle.papersReceived ? (
                  <CircleCheck className="h-5 w-5 text-green-500 mx-auto" />
                ) : (
                  <CircleX className="h-5 w-5 text-red-500 mx-auto" />
                )}
              </TableCell>
              <TableCell className="text-center">
                {vehicle.showroomOnline ? (
                  <CircleCheck className="h-5 w-5 text-green-500 mx-auto" />
                ) : (
                  <CircleX className="h-5 w-5 text-red-500 mx-auto" />
                )}
              </TableCell>
              <TableCell className="text-center">
                {calculateStaDagen(vehicle.createdAt)} dagen
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
                      handleEmailClick("transport_pickup", vehicle.id);
                    }}>
                      <Mail className="h-4 w-4 mr-2" />
                      Pickup document sturen
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleEmailClick("cmr_supplier", vehicle.id);
                    }}>
                      <Mail className="h-4 w-4 mr-2" />
                      CMR naar leverancier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleSendEmail("bpm_huys", vehicle.id);
                    }}>
                      <Mail className="h-4 w-4 mr-2" />
                      BPM Huys aanmelden
                    </DropdownMenuItem>
                    
                    {handleChangeStatus && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Verkoopstatus</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange("verkocht_b2c", vehicle.id);
                        }}>
                          Verkocht particulier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange("verkocht_b2b", vehicle.id);
                        }}>
                          Verkocht B2B
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleChangeStatus(vehicle.id, 'voorraad');
                        }}>
                          Terug naar voorraad
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {handleDeleteVehicle && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Weet je zeker dat je dit voertuig wilt verwijderen?')) {
                              handleDeleteVehicle(vehicle.id);
                            }
                          }}
                          className="text-red-500 focus:text-red-500"
                        >
                          Verwijderen
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

      {/* Dialogs for different actions */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          {dialogType === "transport_pickup" && (
            <>
              <DialogHeader>
                <DialogTitle>Pickup document versturen</DialogTitle>
                <DialogDescription>
                  Selecteer de transporteur om het pickup document te versturen
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="transporter">Transporteur</Label>
                  <Select value={selectedTransporter} onValueChange={setSelectedTransporter}>
                    <SelectTrigger id="transporter">
                      <SelectValue placeholder="Selecteer transporteur" />
                    </SelectTrigger>
                    <SelectContent>
                      {transporters.map(transporter => (
                        <SelectItem key={transporter} value={transporter}>
                          {transporter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleDialogConfirm}>
                  Document versturen
                </Button>
              </DialogFooter>
            </>
          )}

          {dialogType === "cmr_supplier" && (
            <>
              <DialogHeader>
                <DialogTitle>CMR naar leverancier</DialogTitle>
                <DialogDescription>
                  Selecteer de leverancier om het CMR document te versturen
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="supplier">Leverancier</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder="Selecteer leverancier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier} value={supplier}>
                          {supplier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleDialogConfirm}>
                  Document versturen
                </Button>
              </DialogFooter>
            </>
          )}

          {dialogType === "verkocht_b2c" && (
            <>
              <DialogHeader>
                <DialogTitle>Verkocht particulier</DialogTitle>
                <DialogDescription>
                  Vul de gegevens van de particuliere klant in
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="b2c-name">Naam*</Label>
                  <Input 
                    id="b2c-name" 
                    value={selectedB2CCustomer.name} 
                    onChange={(e) => setSelectedB2CCustomer({...selectedB2CCustomer, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="b2c-email">E-mail*</Label>
                  <Input 
                    id="b2c-email" 
                    type="email"
                    value={selectedB2CCustomer.email} 
                    onChange={(e) => setSelectedB2CCustomer({...selectedB2CCustomer, email: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="b2c-phone">Telefoonnummer</Label>
                  <Input 
                    id="b2c-phone" 
                    value={selectedB2CCustomer.phone} 
                    onChange={(e) => setSelectedB2CCustomer({...selectedB2CCustomer, phone: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleDialogConfirm}>
                  Voertuig als verkocht markeren
                </Button>
              </DialogFooter>
            </>
          )}

          {dialogType === "verkocht_b2b" && (
            <>
              <DialogHeader>
                <DialogTitle>Verkocht B2B</DialogTitle>
                <DialogDescription>
                  Selecteer een bestaande B2B klant of maak een nieuwe aan
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="b2b-customer">Bestaande klant</Label>
                  <Select value={selectedB2BCustomer} onValueChange={setSelectedB2BCustomer}>
                    <SelectTrigger id="b2b-customer">
                      <SelectValue placeholder="Selecteer B2B klant" />
                    </SelectTrigger>
                    <SelectContent>
                      {b2bCustomers.map(customer => (
                        <SelectItem key={customer} value={customer}>
                          {customer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="my-2">
                  <p className="text-sm text-muted-foreground mb-2">Of maak een nieuwe B2B klant aan</p>
                  
                  <div className="grid gap-2 mt-2">
                    <Label htmlFor="new-b2b-name">Naam*</Label>
                    <Input 
                      id="new-b2b-name" 
                      value={newB2BCustomer.name} 
                      onChange={(e) => setNewB2BCustomer({...newB2BCustomer, name: e.target.value})}
                      disabled={!!selectedB2BCustomer}
                    />
                  </div>
                  <div className="grid gap-2 mt-2">
                    <Label htmlFor="new-b2b-email">E-mail*</Label>
                    <Input 
                      id="new-b2b-email" 
                      type="email"
                      value={newB2BCustomer.email} 
                      onChange={(e) => setNewB2BCustomer({...newB2BCustomer, email: e.target.value})}
                      disabled={!!selectedB2BCustomer}
                    />
                  </div>
                  <div className="grid gap-2 mt-2">
                    <Label htmlFor="new-b2b-phone">Telefoonnummer</Label>
                    <Input 
                      id="new-b2b-phone" 
                      value={newB2BCustomer.phone} 
                      onChange={(e) => setNewB2BCustomer({...newB2BCustomer, phone: e.target.value})}
                      disabled={!!selectedB2BCustomer}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleDialogConfirm}>
                  Voertuig als verkocht markeren
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
