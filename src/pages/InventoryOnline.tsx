
import React, { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Mail, Plus, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { VehicleTable } from "@/components/inventory/VehicleTable";
import { VehicleDetails } from "@/components/inventory/VehicleDetails";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Vehicle, PaymentStatus, FileCategory } from "@/types/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { useOnlineVehicles } from "@/hooks/useOnlineVehicles";
import { 
  updateVehicle, 
  sendEmail, 
  updateSellingPrice,
  updatePaymentStatus,
  uploadVehiclePhoto,
  markVehicleAsDelivered,
  uploadVehicleFile,
  changeVehicleStatus,
} from "@/services/inventoryService";
import { useVehicleFiles } from "@/hooks/useVehicleFiles";
import { InventoryBulkActions } from "@/components/inventory/InventoryBulkActions";
import { supabase } from "@/integrations/supabase/client";

const InventoryOnline = () => {
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleBulkAction = async (action: string, value?: string) => {
    if (action === 'delete') {
      for (const vehicleId of selectedVehicles) {
        try {
          await supabase.from('vehicles').delete().eq('id', vehicleId);
        } catch (error) {
          console.error('Error deleting vehicle:', error);
        }
      }
      toast({
        title: "Voertuigen verwijderd",
        description: `${selectedVehicles.length} voertuig(en) succesvol verwijderd`,
      });
    } else if (action === 'status' && value) {
      console.log(`[BULK_ACTION] Updating ${selectedVehicles.length} vehicles to status: ${value}`);
      
      for (const vehicleId of selectedVehicles) {
        try {
          const { error } = await supabase
            .from('vehicles')
            .update({ status: value })
            .eq('id', vehicleId);
          
          if (error) {
            console.error('[BULK_ACTION] Error updating vehicle:', error);
            throw error;
          }
        } catch (error) {
          console.error('Error updating vehicle status:', error);
        }
      }
      toast({
        title: "Status bijgewerkt",
        description: `Status van ${selectedVehicles.length} voertuig(en) gewijzigd naar ${value}`,
      });
    }
    
    // Refresh ALL vehicle queries to ensure vehicles move between lists
    await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['b2bVehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['b2cVehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['onlineVehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['deliveredVehicles'] });
    
    setSelectedVehicles([]);
  };
  
  // Use the online vehicles hook
  const {
    vehicles,
    isLoading,
    error,
    sortField,
    sortDirection,
    onSort
  } = useOnlineVehicles();

  // Filter vehicles based on search term
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle =>
      `${vehicle.brand} ${vehicle.model} ${vehicle.licenseNumber} ${vehicle.vin}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);

  // Get files for the selected vehicle
  const { vehicleFiles } = useVehicleFiles(selectedVehicle);
  
  const updateVehicleMutation = useMutation({
    mutationFn: updateVehicle,
    onSuccess: () => {
      toast({
        description: "Voertuig bijgewerkt"
      });
      queryClient.invalidateQueries({ queryKey: ["onlineVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het bijwerken van het voertuig"
      });
      console.error("Error updating vehicle:", error);
    }
  });
  
  const sendEmailMutation = useMutation({
    mutationFn: ({ type, vehicleIds }: { type: string; vehicleIds: string[] }) => 
      sendEmail(type, vehicleIds),
    onSuccess: () => {
      toast({
        description: "De e-mail is succesvol verzonden."
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Er is iets misgegaan bij het verzenden van de e-mail."
      });
    }
  });
  
  const updateSellingPriceMutation = useMutation({
    mutationFn: ({ vehicleId, price }: { vehicleId: string; price: number }) => 
      updateSellingPrice(vehicleId, price),
    onSuccess: () => {
      toast({
        description: "Verkoopprijs bijgewerkt"
      });
      queryClient.invalidateQueries({ queryKey: ["onlineVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het bijwerken van de verkoopprijs"
      });
      console.error("Error updating selling price:", error);
    }
  });
  
  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ vehicleId, status }: { vehicleId: string; status: PaymentStatus }) => 
      updatePaymentStatus(vehicleId, status),
    onSuccess: () => {
      toast({
        description: "Betaalstatus bijgewerkt"
      });
      queryClient.invalidateQueries({ queryKey: ["onlineVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het bijwerken van de betaalstatus"
      });
      console.error("Error updating payment status:", error);
    }
  });

  const markAsDeliveredMutation = useMutation({
    mutationFn: ({ 
      vehicleId, 
      warrantyPackage, 
      warrantyPackageName, 
      deliveryDate, 
      warrantyPackagePrice, 
      deliveryNotes 
    }: { 
      vehicleId: string; 
      warrantyPackage: string; 
      warrantyPackageName: string; 
      deliveryDate: Date; 
      warrantyPackagePrice?: number; 
      deliveryNotes?: string; 
    }) => markVehicleAsDelivered(
      vehicleId, 
      warrantyPackage, 
      warrantyPackageName, 
      deliveryDate, 
      warrantyPackagePrice, 
      deliveryNotes
    ),
    onSuccess: () => {
      toast({
        description: "Voertuig afgeleverd met garantiegegevens"
      });
      queryClient.invalidateQueries({ queryKey: ["onlineVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["deliveredVehicles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het markeren van het voertuig als afgeleverd"
      });
      console.error("Error marking vehicle as delivered:", error);
    }
  });
  
  const handleUploadPhoto = async (file: File, isMain: boolean) => {
    if (!selectedVehicle) return;
    
    try {
      const photoUrl = await uploadVehiclePhoto(selectedVehicle.id, file, isMain);
      
      // Update the vehicle with the new photo
      const updatedPhotos = [...(selectedVehicle.photos || [])];
      if (!updatedPhotos.includes(photoUrl)) {
        updatedPhotos.push(photoUrl);
      }
      
      const updatedVehicle = {
        ...selectedVehicle,
        photos: updatedPhotos,
        mainPhotoUrl: isMain ? photoUrl : selectedVehicle.mainPhotoUrl
      };
      
      updateVehicleMutation.mutate(updatedVehicle);
      setSelectedVehicle(updatedVehicle);
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Fout bij het uploaden van de foto"
      });
      console.error("Error uploading photo:", error);
    }
  };
  
  const handleRemovePhoto = async (photoUrl: string) => {
    if (!selectedVehicle) return;
    
    try {
      const updatedPhotos = selectedVehicle.photos.filter(url => url !== photoUrl);
      let updatedMainPhoto = selectedVehicle.mainPhotoUrl;
      
      if (selectedVehicle.mainPhotoUrl === photoUrl) {
        updatedMainPhoto = updatedPhotos.length > 0 ? updatedPhotos[0] : null;
      }
      
      const updatedVehicle = {
        ...selectedVehicle,
        photos: updatedPhotos,
        mainPhotoUrl: updatedMainPhoto
      };
      
      updateVehicleMutation.mutate(updatedVehicle);
      setSelectedVehicle(updatedVehicle);
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Fout bij het verwijderen van de foto"
      });
      console.error("Error removing photo:", error);
    }
  };
  
  const handleSetMainPhoto = async (photoUrl: string) => {
    if (!selectedVehicle) return;
    
    try {
      const updatedVehicle = {
        ...selectedVehicle,
        mainPhotoUrl: photoUrl
      };
      
      updateVehicleMutation.mutate(updatedVehicle);
      setSelectedVehicle(updatedVehicle);
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Fout bij het instellen van de hoofdfoto"
      });
      console.error("Error setting main photo:", error);
    }
  };
  
  const handleUpdateVehicle = (updatedVehicle: Vehicle) => {
    updateVehicleMutation.mutate(updatedVehicle);
    setSelectedVehicle(null);
  };
  
  const handleSendEmail = (type: string, vehicleId: string) => {
    sendEmailMutation.mutate({ type, vehicleIds: [vehicleId] });
  };
  
  const handleUpdateSellingPrice = (vehicleId: string, price: number) => {
    updateSellingPriceMutation.mutate({ vehicleId, price });
  };
  
  const handleUpdatePaymentStatus = (vehicleId: string, status: PaymentStatus) => {
    updatePaymentStatusMutation.mutate({ vehicleId, status });
  };

  const handleMarkAsDelivered = (
    vehicleId: string,
    warrantyPackage: string,
    warrantyPackageName: string,
    deliveryDate: Date,
    warrantyPackagePrice?: number,
    deliveryNotes?: string
  ) => {
    markAsDeliveredMutation.mutate({
      vehicleId,
      warrantyPackage,
      warrantyPackageName,
      deliveryDate,
      warrantyPackagePrice,
      deliveryNotes
    });
  };
  
  const toggleSelectVehicle = (vehicleId: string, checked: boolean) => {
    setSelectedVehicles(prev => 
      checked 
        ? [...prev, vehicleId]
        : prev.filter(id => id !== vehicleId)
    );
  };
  
  const toggleSelectAll = (checked: boolean) => {
    setSelectedVehicles(checked ? filteredVehicles.map(v => v.id) : []);
  };

  // New mutation for uploading files
  const uploadFileMutation = useMutation({
    mutationFn: ({ file, category, vehicleId }: { file: File, category: FileCategory, vehicleId: string }) =>
      uploadVehicleFile(file, category, vehicleId),
    onSuccess: () => {
      toast({
        description: "Document geüpload"
      });
      queryClient.invalidateQueries({ queryKey: ["vehicleFiles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het uploaden van het document"
      });
      console.error("Error uploading file:", error);
    }
  });
  
  const handleUploadFile = async (file: File, category: FileCategory) => {
    if (!selectedVehicle) return;
    uploadFileMutation.mutate({ file, category, vehicleId: selectedVehicle.id });
  };

  // Add new mutation for changing vehicle status
  const changeVehicleStatusMutation = useMutation({
    mutationFn: ({ vehicleId, status }: { vehicleId: string; status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad' }) => 
      changeVehicleStatus(vehicleId, status),
    onSuccess: () => {
      toast({
        description: "Voertuigstatus bijgewerkt"
      });
      queryClient.invalidateQueries({ queryKey: ["onlineVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["b2bVehicles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het bijwerken van de voertuigstatus"
      });
      console.error("Error updating vehicle status:", error);
    }
  });

  // Add new handler for changing vehicle status
  const handleChangeStatus = (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => {
    changeVehicleStatusMutation.mutate({ vehicleId, status });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader 
          title="Online Voertuigen" 
          description="Beheer voertuigen die online gepubliceerd zijn"
        >
          <InventoryBulkActions 
            selectedVehicles={selectedVehicles}
            onBulkAction={handleBulkAction}
          />
        </PageHeader>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Zoek voertuigen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {filteredVehicles.length} resultaten
            </Badge>
            {selectedVehicles.length > 0 && (
              <Badge variant="secondary">
                {selectedVehicles.length} geselecteerd
              </Badge>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-md shadow">
          <VehicleTable 
            vehicles={filteredVehicles}
            selectedVehicles={selectedVehicles}
            toggleSelectAll={toggleSelectAll}
            toggleSelectVehicle={toggleSelectVehicle}
            handleSelectVehicle={setSelectedVehicle}
            handleSendEmail={handleSendEmail}
            handleChangeStatus={handleChangeStatus}
            isLoading={isLoading}
            error={error}
            onSort={onSort}
            sortField={sortField}
            sortDirection={sortDirection}
            handleMarkAsDelivered={handleMarkAsDelivered}
          />
        </div>
      </div>
      
      {selectedVehicle && (
        <VehicleDetails
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onUpdate={handleUpdateVehicle}
          onSendEmail={handleSendEmail}
          onPhotoUpload={handleUploadPhoto}
          onRemovePhoto={handleRemovePhoto}
          onSetMainPhoto={handleSetMainPhoto}
          onFileUpload={handleUploadFile}
          files={vehicleFiles}
        />
      )}
    </DashboardLayout>
  );
};

export default InventoryOnline;
