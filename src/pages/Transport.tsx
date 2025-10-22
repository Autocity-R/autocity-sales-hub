import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Truck, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Vehicle, ImportStatus, Supplier, FileCategory } from "@/types/inventory";
import { fetchVehicles, updateVehicle, sendEmail, bulkUpdateVehicles, uploadVehicleFile } from "@/services/inventoryService";
import { addContact } from "@/services/customerService";
import { Contact } from "@/types/customer";
import { TransportVehicleTable } from "@/components/transport/TransportVehicleTable";
import { TransportSupplierForm } from "@/components/transport/TransportSupplierForm";
import { TransportDetails } from "@/components/transport/TransportDetails";
import { TransportBulkActions } from "@/components/transport/TransportBulkActions";
import { supabase } from "@/integrations/supabase/client";

const Transport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);

  // Fetch vehicles that have transport status "onderweg"
  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchVehicles,
    select: (data) => data.filter(v => v.transportStatus === "onderweg")
  });

  // Real-time subscription for transport changes
  useEffect(() => {
    const channel = supabase
      .channel('vehicles-transport-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vehicles'
        },
        (payload) => {
          console.log('Vehicle updated (Transport):', payload);
          // Alleen invalideren als het een transport-relevant voertuig is
          queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
    mutationFn: (vehicles: Vehicle[]) => bulkUpdateVehicles(vehicles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({
        title: "Voertuigen bijgewerkt",
        description: "De wijzigingen zijn succesvol opgeslagen voor alle geselecteerde voertuigen.",
        variant: "default",
      });
      setSelectedVehicleIds([]);
    },
    onError: (error) => {
      toast({
        title: "Fout bij bulk update",
        description: "Er is iets misgegaan: " + error,
        variant: "destructive",
      });
    }
  });

  // Email sending mutation
  const emailMutation = useMutation({
    mutationFn: async ({ type, vehicleIds }: { type: string, vehicleIds: string[] }) => {
      // Send the email first
      await sendEmail(type, vehicleIds);
      
      // If this is a pickup document, update the vehicle to mark document as sent
      if (type === "transport_pickup") {
        const vehiclesToUpdate = vehicles
          .filter(v => vehicleIds.includes(v.id))
          .map(v => ({
            ...v,
            details: {
              ...v.details,
              pickupDocumentSent: true,
              pickupDocumentSentDate: new Date().toISOString()
            }
          }));
        
        // Update vehicles in batch
        if (vehiclesToUpdate.length > 0) {
          await bulkUpdateVehicles(vehiclesToUpdate);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
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

  // File upload mutation
  const fileUploadMutation = useMutation({
    mutationFn: ({ file, category, vehicleId }: { file: File, category: FileCategory, vehicleId: string }) => 
      uploadVehicleFile(file, category, vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicleFiles"] });
      toast({
        title: "Document geüpload",
        description: "Het document is succesvol geüpload.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij uploaden document",
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
        importStatus: "aangekomen" as ImportStatus,
        transportStatus: "aangekomen" as const,
        location: "showroom" // Auto-set locatie naar showroom bij binnenmelden
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

  // Handle send email
  const handleSendEmail = (type: string, vehicleId: string) => {
    emailMutation.mutate({ 
      type, 
      vehicleIds: [vehicleId] 
    });
  };

  // Handle file upload
  const handleFileUpload = (file: File, category: FileCategory) => {
    if (selectedVehicle) {
      fileUploadMutation.mutate({ 
        file, 
        category, 
        vehicleId: selectedVehicle.id 
      });
    }
  };

  // Handle multiple selection
  const handleSelectMultiple = (vehicleIds: string[]) => {
    setSelectedVehicleIds(vehicleIds);
  };

  // Handle bulk email sending
  const handleSendBulkEmails = (vehicleIds: string[], transporterId: string) => {
    // We use the supplierId from each vehicle, not the transporterId parameter
    // This ensures each vehicle goes to its own linked transporter
    emailMutation.mutate({ 
      type: "transport_pickup", 
      vehicleIds 
    });
    
    // Reset selection after sending
    setSelectedVehicleIds([]);
  };

  // Handle bulk status update
  const handleUpdateBulkStatus = (vehicleIds: string[], status: ImportStatus) => {
    const vehiclesToUpdate = vehicles
      .filter(v => vehicleIds.includes(v.id))
      .map(v => ({ ...v, importStatus: status }));
    
    if (vehiclesToUpdate.length > 0) {
      bulkUpdateMutation.mutate(vehiclesToUpdate);
    }
  };

  // Create new supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (supplierData: Supplier) => {
      const contactData: Omit<Contact, "id" | "createdAt" | "updatedAt"> = {
        type: "transporter",
        companyName: supplierData.name,
        firstName: supplierData.contactPerson || "",
        lastName: "",
        email: supplierData.email,
        phone: supplierData.phone,
        address: {
          street: supplierData.address || "",
          number: "",
          city: "",
          zipCode: "",
          country: supplierData.country || ""
        },
        additionalEmails: []
      };
      return addContact(contactData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts", "transporter"] });
      toast({
        title: "Transporteur toegevoegd",
        description: "De nieuwe transporteur is succesvol toegevoegd.",
        variant: "default",
      });
      setIsAddSupplierOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Fout bij toevoegen transporteur",
        description: "Er is iets misgegaan: " + error,
        variant: "destructive",
      });
    }
  });

  // Create new supplier
  const handleCreateSupplier = (supplierData: Supplier) => {
    createSupplierMutation.mutate(supplierData);
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
        
        {/* Bulk Actions */}
        <TransportBulkActions
          selectedVehicleIds={selectedVehicleIds}
          onClearSelection={() => setSelectedVehicleIds([])}
          onSendBulkEmails={handleSendBulkEmails}
          onUpdateBulkStatus={handleUpdateBulkStatus}
        />
        
        <div className="rounded-md border overflow-hidden">
          <TransportVehicleTable 
            vehicles={filteredVehicles}
            onSelectVehicle={handleSelectVehicle}
            onMarkAsArrived={handleVehicleArrival}
            onSendPickupDocument={handleSendPickupDocument}
            isLoading={isLoading}
            error={error}
            onSelectMultiple={handleSelectMultiple}
          />
        </div>

        {/* Vehicle Transport Details Dialog */}
        {selectedVehicle && (
          <TransportDetails
            vehicle={selectedVehicle}
            onUpdate={handleVehicleUpdate}
            onClose={() => setSelectedVehicle(null)}
            onSendPickupDocument={handleSendPickupDocument}
            onSendEmail={handleSendEmail}
            onFileUpload={handleFileUpload}
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
