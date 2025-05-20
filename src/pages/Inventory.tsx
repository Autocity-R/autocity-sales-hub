
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Car, CircleCheck, CircleX, Clock, ExternalLink, FileText, 
  PackageCheck, Plus, Truck, Wrench, Search
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

// Mock create function
const createVehicle = async (vehicle: Omit<Vehicle, "id">): Promise<Vehicle> => {
  // Simulating API call
  return {
    ...vehicle,
    id: Math.random().toString(36).substring(7) // Generate random ID
  };
};

const Inventory = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
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
          <Button onClick={() => setIsAddVehicleOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Voeg voertuig toe
          </Button>
        </div>
        
        <Tabs defaultValue="voorraad" className="w-full">
          <TabsList>
            <TabsTrigger value="voorraad">Voorraad</TabsTrigger>
            <TabsTrigger value="online">Online</TabsTrigger>
            <TabsTrigger value="verkocht">Verkocht</TabsTrigger>
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
                        <TableCell colSpan={5} className="h-24 text-center">
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
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="float-right"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectVehicle(vehicle);
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="online">
            <div className="p-8 text-center text-muted-foreground">
              Online voertuigen worden hier weergegeven.
            </div>
          </TabsContent>
          
          <TabsContent value="verkocht">
            <div className="p-8 text-center text-muted-foreground">
              Verkochte voertuigen worden hier weergegeven.
            </div>
          </TabsContent>
        </Tabs>

        {/* Vehicle Details Dialog */}
        {selectedVehicle && (
          <VehicleDetails
            vehicle={selectedVehicle}
            onUpdate={handleVehicleUpdate}
            onClose={() => setSelectedVehicle(null)}
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
      </div>
      
      {/* Chatbot Assistant */}
      <ChatbotAssistant onCommand={handleChatbotCommand} />
    </DashboardLayout>
  );
};

export default Inventory;
