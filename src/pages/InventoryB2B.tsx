
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { VehicleDetails } from "@/components/inventory/VehicleDetails";
import { Vehicle, SalesStatus, PaymentStatus, ImportStatus } from "@/types/inventory";
import { VehicleB2BTable } from "@/components/inventory/VehicleB2BTable";
import { updateVehicle, sendEmail, fetchB2BVehicles, uploadVehiclePhoto } from "@/services/inventoryService";

const InventoryB2B = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Fetch B2B vehicles
  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ["vehicles", "b2b"],
    queryFn: fetchB2BVehicles
  });

  // Update vehicle mutation
  const updateMutation = useMutation({
    mutationFn: updateVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles", "b2b"] });
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

  // Email sending mutation
  const emailMutation = useMutation({
    mutationFn: ({ type, vehicleIds }: { type: string, vehicleIds: string[] }) => 
      sendEmail(type, vehicleIds),
    onSuccess: (_, variables) => {
      let title, description;
      
      switch (variables.type) {
        case "contract_b2b":
          title = "Koopcontract verstuurd";
          description = "Het koopcontract is succesvol naar de klant verstuurd.";
          break;
        case "vehicle_arrived":
          title = "Aankomstbericht verstuurd";
          description = "De klant is geïnformeerd dat de auto is aangekomen.";
          break;
        case "license_registration":
          title = "Kenteken update verstuurd";
          description = "De klant is geïnformeerd over de status van de kentekenregistratie.";
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

  // Handle vehicle selection
  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  // Handle vehicle update from detail panel
  const handleVehicleUpdate = (updatedVehicle: Vehicle) => {
    updateMutation.mutate(updatedVehicle);
    setSelectedVehicle(updatedVehicle);
  };

  // Handle send email
  const handleSendEmail = (type: string, vehicleId: string) => {
    emailMutation.mutate({ type, vehicleIds: [vehicleId] });
  };

  // Handle photo upload
  const handlePhotoUpload = async (vehicleId: string, file: File, isMain: boolean) => {
    await photoUploadMutation.mutateAsync({ vehicleId, file, isMain });
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

  // Filter vehicles based on search term
  const filterVehicles = (vehicles: Vehicle[]) => {
    let filtered = [...vehicles];
    
    // Apply search term filter
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      filtered = filtered.filter(vehicle =>
        vehicle.brand.toLowerCase().includes(searchTermLower) ||
        vehicle.model.toLowerCase().includes(searchTermLower) ||
        vehicle.licenseNumber.toLowerCase().includes(searchTermLower) ||
        vehicle.vin.toLowerCase().includes(searchTermLower)
      );
    }
    
    // Apply sorting if a sort field is selected
    if (sortField) {
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
          case "paymentStatus":
            valueA = a.paymentStatus;
            valueB = b.paymentStatus;
            break;
          case "papersReceived":
            valueA = a.papersReceived;
            valueB = b.papersReceived;
            break;
          case "sellingPrice":
            valueA = a.sellingPrice || 0;
            valueB = b.sellingPrice || 0;
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

  const filteredVehicles = filterVehicles(vehicles);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Verkochte voertuigen B2B</h2>
        </div>
        
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
          <VehicleB2BTable 
            vehicles={filteredVehicles}
            selectedVehicles={selectedVehicles}
            toggleSelectAll={toggleSelectAll}
            toggleSelectVehicle={toggleSelectVehicle}
            handleSelectVehicle={handleSelectVehicle}
            handleSendEmail={handleSendEmail}
            isLoading={isLoading}
            error={error}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        </div>

        {/* Vehicle Details Dialog */}
        {selectedVehicle && (
          <VehicleDetails
            vehicle={selectedVehicle}
            onUpdate={handleVehicleUpdate}
            onClose={() => setSelectedVehicle(null)}
            onSendEmail={handleSendEmail}
            onPhotoUpload={(file, isMain) => handlePhotoUpload(selectedVehicle.id, file, isMain)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default InventoryB2B;
