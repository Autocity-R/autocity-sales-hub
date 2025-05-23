import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { VehicleForm } from "@/components/inventory/VehicleForm";
import { VehicleDetails } from "@/components/inventory/VehicleDetails";
import { ChatbotAssistant } from "@/components/inventory/ChatbotAssistant";
import { BulkActionDialog } from "@/components/inventory/BulkActionDialog";
import { Vehicle, SalesStatus, VehicleFile, FileCategory } from "@/types/inventory";
import { VehicleTable } from "@/components/inventory/VehicleTable";
import { ContactsPanel } from "@/components/inventory/ContactsPanel";
import { useChatbotCommands } from "@/hooks/useChatbotCommands";
import { 
  fetchVehicles, 
  updateVehicle, 
  createVehicle,
  sendEmail,
  bulkUpdateVehicles,
  updateSalesStatus, 
  deleteVehicle,
  uploadVehiclePhoto,
  uploadVehicleFile,
  fetchVehicleFiles
} from "@/services/inventoryService";

const Inventory = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [isBulkActionOpen, setIsBulkActionOpen] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Fetch vehicles
  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchVehicles
  });
  
  // Fetch files for the selected vehicle
  const { data: vehicleFiles = [] } = useQuery({
    queryKey: ["vehicleFiles", selectedVehicle?.id],
    queryFn: () => selectedVehicle ? fetchVehicleFiles(selectedVehicle.id) : Promise.resolve([]),
    enabled: !!selectedVehicle
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
        case "bpm_huys":
          title = "BPM Huys aanmelding verstuurd";
          description = "De aanmelding is succesvol naar BPM Huys verstuurd.";
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

  // Sales status update mutation
  const salesStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SalesStatus }) => 
      updateSalesStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({
        title: "Verkoopstatus bijgewerkt",
        description: "De verkoopstatus van het voertuig is succesvol bijgewerkt.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij bijwerken status",
        description: "Er is iets misgegaan: " + error,
        variant: "destructive",
      });
    }
  });

  // Delete vehicle mutation
  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({
        title: "Voertuig verwijderd",
        description: "Het voertuig is succesvol verwijderd uit het systeem.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij verwijderen",
        description: "Er is iets misgegaan: " + error,
        variant: "destructive",
      });
    }
  });

  // Photo upload mutation
  const photoUploadMutation = useMutation({
    mutationFn: ({ vehicleId, file, isMain }: { vehicleId: string; file: File; isMain: boolean }) => 
      uploadVehiclePhoto(vehicleId, file, isMain),
    onSuccess: (photoUrl, { vehicleId, isMain }) => {
      // After successful upload, find the vehicle and update its photos array
      const currentVehicle = vehicles.find(v => v.id === vehicleId);
      if (currentVehicle) {
        const updatedVehicle = { 
          ...currentVehicle,
          photos: [...currentVehicle.photos, photoUrl]
        };
        
        if (isMain || !currentVehicle.mainPhotoUrl) {
          updatedVehicle.mainPhotoUrl = photoUrl;
        }
        
        updateMutation.mutate(updatedVehicle);
      }
      
      toast({
        title: "Foto geüpload",
        description: "De foto is succesvol geüpload.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij uploaden foto",
        description: "Er is iets misgegaan: " + error,
        variant: "destructive",
      });
    }
  });

  // New mutation for uploading files
  const uploadFileMutation = useMutation({
    mutationFn: ({ file, category, vehicleId }: { file: File, category: FileCategory, vehicleId: string }) =>
      uploadVehicleFile(file, category, vehicleId),
    onSuccess: () => {
      toast({
        title: "Document geüpload",
        description: "Het document is succesvol geüpload.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["vehicleFiles"] });
    },
    onError: (error) => {
      toast({
        title: "Fout bij het uploaden van het document",
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

  // Handle sales status change
  const handleSalesStatusChange = (vehicleId: string, status: SalesStatus) => {
    salesStatusMutation.mutate({ id: vehicleId, status });
  };

  // Handle vehicle deletion
  const handleDeleteVehicle = (vehicleId: string) => {
    deleteMutation.mutate(vehicleId);
  };

  // Photo upload mutation
  const handlePhotoUpload = async (vehicleId: string, file: File, isMain: boolean) => {
    await photoUploadMutation.mutateAsync({ vehicleId, file, isMain });
  };

  // Handle photo removal
  const handleRemovePhoto = async (vehicleId: string, photoUrl: string) => {
    // Placeholder for actual API call
    const currentVehicle = vehicles.find(v => v.id === vehicleId);
    if (currentVehicle) {
      const updatedVehicle = { 
        ...currentVehicle,
        photos: currentVehicle.photos.filter(url => url !== photoUrl)
      };
      
      if (currentVehicle.mainPhotoUrl === photoUrl) {
        updatedVehicle.mainPhotoUrl = updatedVehicle.photos.length > 0 ? updatedVehicle.photos[0] : null;
      }
      
      updateMutation.mutate(updatedVehicle);
      
      toast({
        title: "Foto verwijderd",
        description: "De foto is succesvol verwijderd.",
        variant: "default",
      });
    }
  };

  // Handle setting main photo
  const handleSetMainPhoto = async (vehicleId: string, photoUrl: string) => {
    const currentVehicle = vehicles.find(v => v.id === vehicleId);
    if (currentVehicle) {
      const updatedVehicle = { 
        ...currentVehicle,
        mainPhotoUrl: photoUrl
      };
      
      updateMutation.mutate(updatedVehicle);
      
      toast({
        title: "Hoofdfoto ingesteld",
        description: "De hoofdfoto is succesvol bijgewerkt.",
        variant: "default",
      });
    }
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
          updates: { importStatus: value }
        });
        break;
      case "workshopStatus":
        bulkUpdateMutation.mutate({ 
          ids: selectedVehicles, 
          updates: { workshopStatus: value }
        });
        break;
      case "arrived":
        bulkUpdateMutation.mutate({ 
          ids: selectedVehicles, 
          updates: { arrived: value }
        });
        break;
      case "sendEmail":
        emailMutation.mutate({ 
          type: value, 
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

  // Use the chatbot commands hook
  const { handleChatbotCommand } = useChatbotCommands(vehicles, selectedVehicles);

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter vehicles based on search term and active tab
  const filterVehicles = (vehicles: Vehicle[], tab: string) => {
    let filtered = [...vehicles];
    
    // First apply tab-specific filters
    switch (tab) {
      case "voorraad":
        // Show all vehicles (no filter)
        break;
      case "online":
        filtered = filtered.filter(v => v.showroomOnline);
        break;
      case "offline":
        filtered = filtered.filter(v => v.arrived && !v.showroomOnline);
        break;
      case "klanten":
        // For the klanten tab, we don't need to filter vehicles
        // Since we'll display the ContactsPanel instead
        filtered = [];
        break;
      default:
        break;
    }
    
    // Then apply search term filter
    if (searchTerm && tab !== "klanten") {
      const searchTermLower = searchTerm.toLowerCase();
      filtered = filtered.filter(vehicle =>
        vehicle.brand.toLowerCase().includes(searchTermLower) ||
        vehicle.model.toLowerCase().includes(searchTermLower) ||
        vehicle.licenseNumber.toLowerCase().includes(searchTermLower) ||
        vehicle.vin.toLowerCase().includes(searchTermLower)
      );
    }
    
    // Apply sorting if a sort field is selected
    if (sortField && tab !== "klanten") {
      filtered.sort((a, b) => {
        let valueA: any;
        let valueB: any;
        
        // Extract the values based on sort field
        switch (sortField) {
          case "brand":
            valueA = a.brand.toLowerCase();
            valueB = b.brand.toLowerCase();
            break;
          case "model":
            valueA = a.model.toLowerCase();
            valueB = b.model.toLowerCase();
            break;
          case "licenseNumber":
            valueA = a.licenseNumber.toLowerCase();
            valueB = b.licenseNumber.toLowerCase();
            break;
          case "vin":
            valueA = a.vin.toLowerCase();
            valueB = b.vin.toLowerCase();
            break;
          case "mileage":
            valueA = a.mileage;
            valueB = b.mileage;
            break;
          case "importStatus":
            valueA = a.importStatus;
            valueB = b.importStatus;
            break;
          case "location":
            valueA = a.location;
            valueB = b.location;
            break;
          case "arrived":
            valueA = a.arrived;
            valueB = b.arrived;
            break;
          case "papersReceived":
            valueA = a.papersReceived;
            valueB = b.papersReceived;
            break;
          case "showroomOnline":
            valueA = a.showroomOnline;
            valueB = b.showroomOnline;
            break;
          case "staDagen":
            // Calculate stay days (assuming a createdAt field exists, else we'll need to add it)
            const now = new Date();
            valueA = a.createdAt ? Math.floor((now.getTime() - new Date(a.createdAt).getTime()) / (1000 * 3600 * 24)) : 0;
            valueB = b.createdAt ? Math.floor((now.getTime() - new Date(b.createdAt).getTime()) / (1000 * 3600 * 24)) : 0;
            break;
          default:
            return 0;
        }
        
        // Compare the values
        if (valueA < valueB) {
          return sortDirection === "asc" ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortDirection === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  };

  // Get active tab from URL or default to "voorraad"
  const [activeTab, setActiveTab] = useState("voorraad");
  const filteredVehicles = filterVehicles(vehicles, activeTab);

  // Handle file upload
  const handleFileUpload = (file: File, category: FileCategory) => {
    if (selectedVehicle) {
      uploadFileMutation.mutate({
        file,
        category,
        vehicleId: selectedVehicle.id
      });
    }
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
        
        <Tabs
          defaultValue="voorraad"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="voorraad">Voorraad</TabsTrigger>
            <TabsTrigger value="online">Online</TabsTrigger>
            <TabsTrigger value="offline">Offline</TabsTrigger>
            <TabsTrigger value="klanten">Klanten & Leveranciers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="voorraad" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Zoek op merk, model, kenteken of VIN..." 
                className="max-w-sm" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="rounded-md border overflow-hidden">
              <VehicleTable 
                vehicles={filteredVehicles}
                selectedVehicles={selectedVehicles}
                toggleSelectAll={toggleSelectAll}
                toggleSelectVehicle={toggleSelectVehicle}
                handleSelectVehicle={handleSelectVehicle}
                handleSendEmail={handleSendEmail}
                handleChangeStatus={handleSalesStatusChange}
                handleDeleteVehicle={handleDeleteVehicle}
                isLoading={isLoading}
                error={error}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="online" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Zoek op merk, model, kenteken of VIN..." 
                className="max-w-sm" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="rounded-md border overflow-hidden">
              <VehicleTable 
                vehicles={filteredVehicles}
                selectedVehicles={selectedVehicles}
                toggleSelectAll={toggleSelectAll}
                toggleSelectVehicle={toggleSelectVehicle}
                handleSelectVehicle={handleSelectVehicle}
                handleSendEmail={handleSendEmail}
                handleChangeStatus={handleSalesStatusChange}
                handleDeleteVehicle={handleDeleteVehicle}
                isLoading={isLoading}
                error={error}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="offline" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Zoek op merk, model, kenteken of VIN..." 
                className="max-w-sm" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="rounded-md border overflow-hidden">
              <VehicleTable 
                vehicles={filteredVehicles}
                selectedVehicles={selectedVehicles}
                toggleSelectAll={toggleSelectAll}
                toggleSelectVehicle={toggleSelectVehicle}
                handleSelectVehicle={handleSelectVehicle}
                handleSendEmail={handleSendEmail}
                handleChangeStatus={handleSalesStatusChange}
                handleDeleteVehicle={handleDeleteVehicle}
                isLoading={isLoading}
                error={error}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="klanten" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Zoek klanten of leveranciers..." 
                className="max-w-sm" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="rounded-md border p-4">
              <ContactsPanel />
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
            onPhotoUpload={(file, isMain) => handlePhotoUpload(selectedVehicle.id, file, isMain)}
            onRemovePhoto={(photoUrl) => handleRemovePhoto(selectedVehicle.id, photoUrl)}
            onSetMainPhoto={(photoUrl) => handleSetMainPhoto(selectedVehicle.id, photoUrl)}
            onFileUpload={handleFileUpload}
            files={vehicleFiles}
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
