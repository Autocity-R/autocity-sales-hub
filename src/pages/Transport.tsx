
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Truck, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Vehicle, ImportStatus, Supplier } from "@/types/inventory";
import { fetchVehicles, updateVehicle, sendEmail } from "@/services/inventoryService";
import { TransportVehicleTable } from "@/components/transport/TransportVehicleTable";
import { TransportSupplierForm } from "@/components/transport/TransportSupplierForm";
import { TransportDetails } from "@/components/transport/TransportDetails";

const Transport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);

  // Fetch vehicles that are not arrived yet
  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchVehicles,
    select: (data) => data.filter(v => !v.arrived)
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

  // Email sending mutation
  const emailMutation = useMutation({
    mutationFn: ({ type, vehicleIds }: { type: string, vehicleIds: string[] }) => 
      sendEmail(type, vehicleIds),
    onSuccess: (_, variables) => {
      toast({
        title: "Pickup document verstuurd",
        description: "De pickup documenten zijn succesvol naar de transporteur verstuurd.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij versturen pickup document",
        description: "Er is iets misgegaan: " + error,
        variant: "destructive",
      });
    }
  });

  // Handle vehicle selection
  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  // Handle vehicle update
  const handleVehicleUpdate = (updatedVehicle: Vehicle) => {
    updateMutation.mutate(updatedVehicle);
    setSelectedVehicle(null); // Close details after update
  };

  // Handle vehicle arrival
  const handleVehicleArrival = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      updateMutation.mutate({ 
        ...vehicle, 
        arrived: true, 
        importStatus: "aangekomen" as ImportStatus 
      });
    }
  };

  // Handle send pickup document
  const handleSendPickupDocument = (vehicleId: string) => {
    emailMutation.mutate({ 
      type: "transport_pickup", 
      vehicleIds: [vehicleId] 
    });
  };

  // Create new supplier
  const handleCreateSupplier = (supplierData: Supplier) => {
    // In a real application, this would call an API to create a supplier
    console.log("Creating supplier:", supplierData);
    toast({
      title: "Transporteur toegevoegd",
      description: "De nieuwe transporteur is succesvol toegevoegd.",
      variant: "default",
    });
    setIsAddSupplierOpen(false);
  };

  // Filter vehicles based on search term
  const filteredVehicles = vehicles.filter(vehicle => 
    vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.vin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Transport</h2>
          <Button onClick={() => setIsAddSupplierOpen(true)}>
            <Truck className="mr-2 h-4 w-4" /> 
            Transporteur toevoegen
          </Button>
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
          <TransportVehicleTable 
            vehicles={filteredVehicles}
            onSelectVehicle={handleSelectVehicle}
            onMarkAsArrived={handleVehicleArrival}
            onSendPickupDocument={handleSendPickupDocument}
            isLoading={isLoading}
            error={error}
          />
        </div>

        {/* Vehicle Transport Details Dialog */}
        {selectedVehicle && (
          <TransportDetails
            vehicle={selectedVehicle}
            onUpdate={handleVehicleUpdate}
            onClose={() => setSelectedVehicle(null)}
            onSendPickupDocument={handleSendPickupDocument}
          />
        )}
        
        {/* Add Transporter Dialog */}
        <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nieuwe transporteur toevoegen</DialogTitle>
              <DialogDescription>
                Vul de gegevens van de nieuwe transporteur in.
              </DialogDescription>
            </DialogHeader>
            <TransportSupplierForm onSubmit={handleCreateSupplier} />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Transport;
