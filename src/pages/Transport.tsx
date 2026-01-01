import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Truck, Download, Eye, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Vehicle, ImportStatus, Supplier, FileCategory } from "@/types/inventory";
import { fetchTransportVehicles, updateVehicle, sendEmail, bulkUpdateVehicles, uploadVehicleFile } from "@/services/inventoryService";
import { addContact } from "@/services/customerService";
import { Contact } from "@/types/customer";
import { TransportVehicleTable } from "@/components/transport/TransportVehicleTable";
import { TransportSupplierForm } from "@/components/transport/TransportSupplierForm";
import { TransportDetails } from "@/components/transport/TransportDetails";
import { TransportBulkActions } from "@/components/transport/TransportBulkActions";
import { supabase } from "@/integrations/supabase/client";
import { useTransportVehicleOperations } from "@/hooks/useTransportVehicleOperations";
import { exportTransportToExcel, getPaymentStatusDisplay, getPickupStatusDisplay, getCustomerName } from "@/utils/transportExport";

const Transport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleBulkAssignTransporter } = useTransportVehicleOperations();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [isViewSelectionOpen, setIsViewSelectionOpen] = useState(false);

  // Fetch vehicles that have transport status "onderweg" (already relationship-enriched)
  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ["transportVehicles"],
    queryFn: fetchTransportVehicles,
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
          queryClient.invalidateQueries({ queryKey: ["transportVehicles"] });
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
      queryClient.invalidateQueries({ queryKey: ["transportVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
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
      queryClient.invalidateQueries({ queryKey: ["transportVehicles"] });
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
      queryClient.invalidateQueries({ queryKey: ["transportVehicles"] });
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

  // Handle bulk transporter assignment
  const handleAssignTransporter = (vehicleIds: string[], transporterId: string) => {
    handleBulkAssignTransporter(vehicleIds, transporterId);
    setSelectedVehicleIds([]);
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

  // Get selected vehicles for export/view
  const selectedVehicles = vehicles.filter(v => selectedVehicleIds.includes(v.id));

  // Handle Excel export - all filtered vehicles
  const handleExportAll = async () => {
    try {
      const result = await exportTransportToExcel(filteredVehicles);
      toast({
        title: "Excel geëxporteerd",
        description: `${result.count} voertuigen geëxporteerd naar ${result.filename}`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Export mislukt",
        description: "Er is iets misgegaan bij het exporteren.",
        variant: "destructive",
      });
    }
  };

  // Handle Excel export - selected vehicles only
  const handleExportSelected = async () => {
    if (selectedVehicles.length === 0) {
      toast({
        title: "Geen selectie",
        description: "Selecteer eerst voertuigen om te exporteren.",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await exportTransportToExcel(selectedVehicles);
      toast({
        title: "Excel geëxporteerd",
        description: `${result.count} geselecteerde voertuigen geëxporteerd naar ${result.filename}`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Export mislukt",
        description: "Er is iets misgegaan bij het exporteren.",
        variant: "destructive",
      });
    }
  };

  // Copy VINs to clipboard
  const handleCopyVins = () => {
    const vins = selectedVehicles.map(v => v.vin).join('\n');
    navigator.clipboard.writeText(vins);
    toast({
      title: "VIN's gekopieerd",
      description: `${selectedVehicles.length} VIN's naar klembord gekopieerd.`,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Transport</h2>
          <div className="flex items-center gap-2">
            {selectedVehicleIds.length > 0 && (
              <>
                <Button variant="outline" onClick={() => setIsViewSelectionOpen(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Bekijk selectie ({selectedVehicleIds.length})
                </Button>
                <Button variant="outline" onClick={handleExportSelected}>
                  <Download className="mr-2 h-4 w-4" />
                  Export selectie ({selectedVehicleIds.length})
                </Button>
              </>
            )}
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="mr-2 h-4 w-4" /> 
              Export alles ({filteredVehicles.length})
            </Button>
            <Button onClick={() => setIsAddSupplierOpen(true)}>
              <Truck className="mr-2 h-4 w-4" /> 
              Transporteur toevoegen
            </Button>
          </div>
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
          onAssignTransporter={handleAssignTransporter}
        />
        
        <div className="rounded-md border overflow-hidden">
          <TransportVehicleTable 
            vehicles={filteredVehicles}
            onSelectVehicle={handleSelectVehicle}
            onMarkAsArrived={handleVehicleArrival}
            onSendPickupDocument={handleSendPickupDocument}
            isLoading={isLoading}
            error={error}
            selectedVehicleIds={selectedVehicleIds}
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
        
        {/* View Selection Dialog */}
        <Dialog open={isViewSelectionOpen} onOpenChange={setIsViewSelectionOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Geselecteerde voertuigen ({selectedVehicles.length})</DialogTitle>
              <DialogDescription>
                Overzicht van je geselecteerde voertuigen. Je kunt de VIN's kopiëren of exporteren.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={handleCopyVins}>
                <Copy className="mr-2 h-4 w-4" />
                Kopieer VIN's
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportSelected}>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merk</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>VIN</TableHead>
                    <TableHead>Kenteken</TableHead>
                    <TableHead>Betaalstatus</TableHead>
                    <TableHead>Pickup Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.brand}</TableCell>
                      <TableCell>{vehicle.model}</TableCell>
                      <TableCell className="font-mono text-sm">{vehicle.vin}</TableCell>
                      <TableCell>{vehicle.licenseNumber || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getPaymentStatusDisplay(vehicle)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getPickupStatusDisplay(vehicle)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </DialogContent>
        </Dialog>

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
