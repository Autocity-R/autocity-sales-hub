
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Car, CircleCheck, CircleX, Clock, ExternalLink, FileText, 
  PackageCheck, Plus, Truck, Wrench, Search, Mail, Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils";
import { VehicleForm } from "@/components/inventory/VehicleForm";
import { VehicleDetails } from "@/components/inventory/VehicleDetails";
import { ChatbotAssistant } from "@/components/inventory/ChatbotAssistant";
import { BulkActionDialog } from "@/components/inventory/BulkActionDialog";

// Define TypeScript types
export type ImportStatus = 
  | "niet_gestart" 
  | "transport_geregeld" 
  | "onderweg" 
  | "aangekomen" 
  | "afgemeld";

export type WorkshopStatus = 
  | "wachten" 
  | "poetsen" 
  | "spuiten" 
  | "gereed";

export type DamageStatus = 
  | "geen" 
  | "licht" 
  | "middel" 
  | "zwaar" 
  | "total_loss";

export interface Vehicle {
  id: string;
  licenseNumber: string;
  model: string;
  importStatus: ImportStatus;
  arrived: boolean;
  workshopStatus: WorkshopStatus;
  showroomOnline: boolean;
  bpmRequested: boolean;
  damage: {
    description: string;
    status: DamageStatus;
  };
  purchasePrice: number;
  cmrSent: boolean;
  cmrDate: Date | null;
  papersReceived: boolean;
  papersDate: Date | null;
  notes: string;
}

// Mock API for demonstration
const fetchVehicles = async (): Promise<Vehicle[]> => {
  // Simulating API call
  return [
    {
      id: "1",
      licenseNumber: "HNZ-60-N",
      model: "Audi A4 2.0 TDI",
      importStatus: "niet_gestart",
      arrived: false,
      workshopStatus: "wachten",
      showroomOnline: false,
      bpmRequested: false,
      damage: {
        description: "Kras op voorportier",
        status: "licht"
      },
      purchasePrice: 18500,
      cmrSent: false,
      cmrDate: null,
      papersReceived: false,
      papersDate: null,
      notes: ""
    },
    {
      id: "2",
      licenseNumber: "AB-123-C",
      model: "BMW 3-serie 320d",
      importStatus: "onderweg",
      arrived: false,
      workshopStatus: "wachten",
      showroomOnline: false,
      bpmRequested: true,
      damage: {
        description: "",
        status: "geen"
      },
      purchasePrice: 24500,
      cmrSent: true,
      cmrDate: new Date(2023, 5, 15),
      papersReceived: false,
      papersDate: null,
      notes: "Verwacht eind deze week"
    },
    {
      id: "3",
      licenseNumber: "ZX-789-Y",
      model: "Mercedes E-Klasse",
      importStatus: "aangekomen",
      arrived: true,
      workshopStatus: "poetsen",
      showroomOnline: false,
      bpmRequested: true,
      damage: {
        description: "Deuk in achterbumper",
        status: "middel"
      },
      purchasePrice: 32000,
      cmrSent: true,
      cmrDate: new Date(2023, 4, 20),
      papersReceived: true,
      papersDate: new Date(2023, 5, 1),
      notes: "Klant heeft interesse getoond"
    }
  ];
};

// Mock update function
const updateVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
  // Simulating API call
  return vehicle;
};

// Mock bulk update function
const bulkUpdateVehicles = async (ids: string[], updates: Partial<Vehicle>): Promise<Vehicle[]> => {
  // Simulating API call
  console.log("Bulk updating vehicles:", ids, updates);
  return []; // Would normally return updated vehicles
};

// Mock create function
const createVehicle = async (vehicle: Omit<Vehicle, "id">): Promise<Vehicle> => {
  // Simulating API call
  return {
    ...vehicle,
    id: Math.random().toString(36).substring(7) // Generate random ID
  };
};

// Mock email sending function
const sendEmail = async (type: string, vehicleIds: string[]): Promise<boolean> => {
  // Simulating API call
  console.log(`Sending ${type} email for vehicles:`, vehicleIds);
  return true;
};

const Inventory = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [isBulkActionOpen, setIsBulkActionOpen] = useState(false);
  
  // Fetch vehicles
  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchVehicles
  });

  // Update vehicle mutation
  const updateMutation = useMutation({
    mutationFn: updateVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({
        title: "Voertuig bijgewerkt",
        description: "De wijzigingen zijn succesvol opgeslagen.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij bijwerken",
        description: "Er is iets misgegaan: " + error,
        variant: "destructive",
      });
    }
  });

  // Bulk update vehicles mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, updates }: { ids: string[], updates: Partial<Vehicle> }) => 
      bulkUpdateVehicles(ids, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setSelectedVehicles([]);
      toast({
        title: "Voertuigen bijgewerkt",
        description: `${selectedVehicles.length} voertuigen zijn succesvol bijgewerkt.`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij bulk-update",
        description: "Er is iets misgegaan: " + error,
        variant: "destructive",
      });
    }
  });

  // Create vehicle mutation
  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setIsAddVehicleOpen(false);
      toast({
        title: "Voertuig toegevoegd",
        description: "Het nieuwe voertuig is succesvol toegevoegd.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij toevoegen",
        description: "Er is iets misgegaan: " + error,
        variant: "destructive",
      });
    }
  });

  // Email sending mutation
  const emailMutation = useMutation({
    mutationFn: ({ type, vehicleIds }: { type: string, vehicleIds: string[] }) => 
      sendEmail(type, vehicleIds),
    onSuccess: (_, variables) => {
      let title, description;
      
      switch (variables.type) {
        case "transport_pickup":
          title = "Transport pickup document verstuurd";
          description = "De pickup documenten zijn succesvol naar de transporteur verstuurd.";
          break;
        case "cmr_supplier":
          title = "CMR naar leverancier verstuurd";
          description = "De CMR documenten zijn succesvol naar de leverancier verstuurd.";
          break;
        case "reminder_papers":
          title = "Herinnering verstuurd";
          description = "De herinneringsmail voor de papieren is succesvol verstuurd.";
          break;
        default:
          title = "E-mail verstuurd";
          description = "De e-mail is succesvol verstuurd.";
      }
      
      toast({
        title,
        description,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij versturen e-mail",
        description: "Er is iets misgegaan: " + error,
        variant: "destructive",
      });
    }
  });

  // Handle vehicle selection
  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  // Handle vehicle update from detail panel
  const handleVehicleUpdate = (updatedVehicle: Vehicle) => {
    updateMutation.mutate(updatedVehicle);
    setSelectedVehicle(updatedVehicle);
  };

  // Handle vehicle creation
  const handleVehicleCreate = (vehicleData: Omit<Vehicle, "id">) => {
    createMutation.mutate(vehicleData);
  };

  // Handle send email
  const handleSendEmail = (type: string, vehicleId: string) => {
    emailMutation.mutate({ type, vehicleIds: [vehicleId] });
  };

  // Handle bulk action
  const handleBulkAction = (action: string, value: any) => {
    if (selectedVehicles.length === 0) {
      toast({
        title: "Geen voertuigen geselecteerd",
        description: "Selecteer minstens één voertuig om een bulk-actie uit te voeren.",
        variant: "destructive",
      });
      return;
    }

    switch (action) {
      case "importStatus":
        bulkUpdateMutation.mutate({ 
          ids: selectedVehicles, 
          updates: { importStatus: value as ImportStatus }
        });
        break;
      case "workshopStatus":
        bulkUpdateMutation.mutate({ 
          ids: selectedVehicles, 
          updates: { workshopStatus: value as WorkshopStatus }
        });
        break;
      case "arrived":
        bulkUpdateMutation.mutate({ 
          ids: selectedVehicles, 
          updates: { arrived: value as boolean }
        });
        break;
      case "sendEmail":
        emailMutation.mutate({ 
          type: value as string, 
          vehicleIds: selectedVehicles
        });
        break;
      default:
        console.error("Unknown bulk action:", action);
    }
    
    setIsBulkActionOpen(false);
  };

  // Toggle select all vehicles
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVehicles(filteredVehicles.map(v => v.id));
    } else {
      setSelectedVehicles([]);
    }
  };

  // Toggle select individual vehicle
  const toggleSelectVehicle = (vehicleId: string, checked: boolean) => {
    if (checked) {
      setSelectedVehicles([...selectedVehicles, vehicleId]);
    } else {
      setSelectedVehicles(selectedVehicles.filter(id => id !== vehicleId));
    }
  };

  // Handle chatbot commands
  const handleChatbotCommand = (command: string) => {
    // Example: "Markeer voertuig HNZ-60-N als 'transport geregeld'"
    if (command.includes("Markeer voertuig") && command.includes("als 'transport geregeld'")) {
      const licenseNumber = command.split("Markeer voertuig ")[1].split(" als")[0];
      
      const vehicle = vehicles.find(v => v.licenseNumber === licenseNumber);
      if (vehicle) {
        const updatedVehicle = {
          ...vehicle,
          importStatus: "transport_geregeld" as ImportStatus
        };
        updateMutation.mutate(updatedVehicle);
        
        return {
          success: true,
          message: `Voertuig ${licenseNumber} gemarkeerd als 'transport geregeld'`
        };
      }
      return { 
        success: false, 
        message: `Voertuig ${licenseNumber} niet gevonden` 
      };
    }
    
    // Example: "Voeg notitie toe aan voertuig ABC-123: klant gebeld"
    if (command.includes("Voeg notitie toe aan voertuig")) {
      const parts = command.split("Voeg notitie toe aan voertuig ");
      if (parts.length > 1) {
        const restParts = parts[1].split(": ");
        if (restParts.length > 1) {
          const licenseNumber = restParts[0];
          const note = restParts[1];
          
          const vehicle = vehicles.find(v => v.licenseNumber === licenseNumber);
          if (vehicle) {
            const updatedVehicle = {
              ...vehicle,
              notes: vehicle.notes + (vehicle.notes ? "\n" : "") + note
            };
            updateMutation.mutate(updatedVehicle);
            
            return {
              success: true,
              message: `Notitie toegevoegd aan voertuig ${licenseNumber}`
            };
          }
          return { 
            success: false, 
            message: `Voertuig ${licenseNumber} niet gevonden` 
          };
        }
      }
      return { 
        success: false, 
        message: "Onjuiste opdrachtnotatie. Probeer: 'Voeg notitie toe aan voertuig XXX-00-X: jouw notitie'" 
      };
    }

    // Handle bulk update via chatbot
    if (command.includes("Markeer alle geselecteerde voertuigen als")) {
      if (selectedVehicles.length === 0) {
        return {
          success: false,
          message: "Geen voertuigen geselecteerd"
        };
      }
      
      if (command.includes("'transport geregeld'")) {
        bulkUpdateMutation.mutate({
          ids: selectedVehicles,
          updates: { importStatus: "transport_geregeld" }
        });
        return {
          success: true,
          message: `${selectedVehicles.length} voertuigen gemarkeerd als 'transport geregeld'`
        };
      }
      
      if (command.includes("'aangekomen'")) {
        bulkUpdateMutation.mutate({
          ids: selectedVehicles,
          updates: { importStatus: "aangekomen", arrived: true }
        });
        return {
          success: true,
          message: `${selectedVehicles.length} voertuigen gemarkeerd als 'aangekomen'`
        };
      }
      
      if (command.includes("'gereed'")) {
        bulkUpdateMutation.mutate({
          ids: selectedVehicles,
          updates: { workshopStatus: "gereed" }
        });
        return {
          success: true,
          message: `${selectedVehicles.length} voertuigen gemarkeerd als 'gereed'`
        };
      }
    }

    // Handle email sending via chatbot
    if (command.includes("Stuur transport pickup document naar")) {
      const licenseNumber = command.split("Stuur transport pickup document naar ")[1].trim();
      const vehicle = vehicles.find(v => v.licenseNumber === licenseNumber);
      
      if (vehicle) {
        emailMutation.mutate({
          type: "transport_pickup",
          vehicleIds: [vehicle.id]
        });
        return {
          success: true,
          message: `Transport pickup document verstuurd voor voertuig ${licenseNumber}`
        };
      }
      return {
        success: false,
        message: `Voertuig ${licenseNumber} niet gevonden`
      };
    }

    // Default response for unhandled commands
    return { 
      success: false, 
      message: "Ik begrijp deze opdracht niet. Probeer een andere formulering." 
    };
  };

  // Filter vehicles based on search term
  const filteredVehicles = vehicles.filter(vehicle => 
    vehicle.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render the import status badge with appropriate color
  const renderImportStatusBadge = (status: ImportStatus) => {
    const statusMap: Record<ImportStatus, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
      niet_gestart: { label: "Niet gestart", variant: "outline" },
      transport_geregeld: { label: "Transport geregeld", variant: "secondary" },
      onderweg: { label: "Onderweg", variant: "secondary" },
      aangekomen: { label: "Aangekomen", variant: "default" },
      afgemeld: { label: "Afgemeld", variant: "destructive" },
    };
    
    const { label, variant } = statusMap[status];
    
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Voorraad</h2>
          <div className="flex gap-2">
            {selectedVehicles.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setIsBulkActionOpen(true)}
              >
                Bulk actie ({selectedVehicles.length})
              </Button>
            )}
            <Button onClick={() => setIsAddVehicleOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Voeg voertuig toe
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="voorraad" className="w-full">
          <TabsList>
            <TabsTrigger value="voorraad">Voorraad</TabsTrigger>
            <TabsTrigger value="online">Online</TabsTrigger>
            <TabsTrigger value="verkocht">Verkocht</TabsTrigger>
            <TabsTrigger value="klanten">Klanten & Leveranciers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="voorraad" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Zoek op kenteken of model..." 
                className="max-w-sm" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="rounded-md border">
              {isLoading ? (
                <div className="p-8 text-center">Laden...</div>
              ) : error ? (
                <div className="p-8 text-center text-destructive">Er is een fout opgetreden bij het laden van de gegevens.</div>
              ) : (
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                          checked={selectedVehicles.length === filteredVehicles.length && filteredVehicles.length > 0}
                          indeterminate={selectedVehicles.length > 0 && selectedVehicles.length < filteredVehicles.length}
                        />
                      </TableHead>
                      <TableHead className="w-[150px]">
                        <div className="flex items-center space-x-1">
                          <Car className="h-4 w-4" />
                          <span>Kenteken</span>
                        </div>
                      </TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Importstatus</TableHead>
                      <TableHead className="text-center">Aangekomen</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Geen voertuigen gevonden.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVehicles.map((vehicle) => (
                        <TableRow 
                          key={vehicle.id}
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleSelectVehicle(vehicle)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedVehicles.includes(vehicle.id)}
                              onCheckedChange={(checked) => toggleSelectVehicle(vehicle.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{vehicle.licenseNumber}</TableCell>
                          <TableCell>{vehicle.model}</TableCell>
                          <TableCell>{renderImportStatusBadge(vehicle.importStatus)}</TableCell>
                          <TableCell className="text-center">
                            {vehicle.arrived ? (
                              <CircleCheck className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <CircleX className="h-5 w-5 text-red-500 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="float-right"
                                >
                                  <ExternalLink className="h-4 w-4" />
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
                                  handleSendEmail("transport_pickup", vehicle.id);
                                }}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Pickup document sturen
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendEmail("cmr_supplier", vehicle.id);
                                }}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  CMR naar leverancier
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="online" className="space-y-4">
            <div className="p-8 text-center text-muted-foreground">
              Online voertuigen worden hier weergegeven.
            </div>
          </TabsContent>
          
          <TabsContent value="verkocht" className="space-y-4">
            <div className="p-8 text-center text-muted-foreground">
              Verkochte voertuigen worden hier weergegeven.
            </div>
          </TabsContent>
          
          <TabsContent value="klanten" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Suppliers section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Leveranciers</h3>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe leverancier
                  </Button>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>Land</TableHead>
                        <TableHead>Contactpersoon</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Auto Schmidt</TableCell>
                        <TableCell>Duitsland</TableCell>
                        <TableCell>Hans Schmidt</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Deutsche Autos GmbH</TableCell>
                        <TableCell>Duitsland</TableCell>
                        <TableCell>Klaus Mueller</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Car Connect</TableCell>
                        <TableCell>België</TableCell>
                        <TableCell>Jan Janssens</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              {/* Customers section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Klanten</h3>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe klant
                  </Button>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Fam. Jansen</TableCell>
                        <TableCell>Particulier</TableCell>
                        <TableCell>06-12345678</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Dhr. Pietersen</TableCell>
                        <TableCell>Particulier</TableCell>
                        <TableCell>06-87654321</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>De Boer Auto's</TableCell>
                        <TableCell>Zakelijk</TableCell>
                        <TableCell>info@deboer.nl</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Vehicle Details Dialog */}
        {selectedVehicle && (
          <VehicleDetails
            vehicle={selectedVehicle}
            onUpdate={handleVehicleUpdate}
            onClose={() => setSelectedVehicle(null)}
            onSendEmail={handleSendEmail}
          />
        )}
        
        {/* Add Vehicle Dialog */}
        <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Nieuw voertuig toevoegen</DialogTitle>
              <DialogDescription>
                Vul de gegevens van het nieuwe voertuig in.
              </DialogDescription>
            </DialogHeader>
            <VehicleForm onSubmit={handleVehicleCreate} />
          </DialogContent>
        </Dialog>
        
        {/* Bulk Action Dialog */}
        <BulkActionDialog 
          open={isBulkActionOpen} 
          onOpenChange={setIsBulkActionOpen} 
          onApply={handleBulkAction}
          count={selectedVehicles.length}
        />
      </div>
      
      {/* Chatbot Assistant */}
      <ChatbotAssistant onCommand={handleChatbotCommand} />
    </DashboardLayout>
  );
};

export default Inventory;
