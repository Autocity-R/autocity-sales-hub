import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Mail, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { VehicleB2CTable } from "@/components/inventory/VehicleB2CTable";
import { VehicleDetails } from "@/components/inventory/VehicleDetails";
import { Button } from "@/components/ui/button";
import { Vehicle, PaymentStatus, PaintStatus, FileCategory } from "@/types/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { 
  fetchB2CVehicles, 
  updateVehicle, 
  sendEmail, 
  updateSellingPrice,
  updatePaymentStatus,
  uploadVehiclePhoto,
  updatePaintStatus,
  markVehicleAsDelivered,
  uploadVehicleFile,
  changeVehicleStatus,
} from "@/services/inventoryService";
import { useVehicleFiles } from "@/hooks/useVehicleFiles";

const InventoryB2C = () => {
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch B2C sold vehicles only
  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ["b2cVehicles"],
    queryFn: fetchB2CVehicles
  });

  // Properly fetch files for selected vehicle using our hook
  const { vehicleFiles } = useVehicleFiles(selectedVehicle);
  
  const updateVehicleMutation = useMutation({
    mutationFn: updateVehicle,
    onSuccess: () => {
      toast({
        description: "Voertuig bijgewerkt"
      });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
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
        description: "E-mail verzonden"
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het verzenden van e-mail"
      });
      console.error("Error sending email:", error);
    }
  });
  
  const updateSellingPriceMutation = useMutation({
    mutationFn: ({ vehicleId, price }: { vehicleId: string; price: number }) => 
      updateSellingPrice(vehicleId, price),
    onSuccess: () => {
      toast({
        description: "Verkoopprijs bijgewerkt"
      });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
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
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het bijwerken van de betaalstatus"
      });
      console.error("Error updating payment status:", error);
    }
  });

  const updatePaintStatusMutation = useMutation({
    mutationFn: ({ vehicleId, status }: { vehicleId: string; status: PaintStatus }) => 
      updatePaintStatus(vehicleId, status),
    onSuccess: () => {
      toast({
        description: "Lakstatus bijgewerkt"
      });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het bijwerken van de lakstatus"
      });
      console.error("Error updating paint status:", error);
    }
  });

  const markAsDeliveredMutation = useMutation({
    mutationFn: (vehicleId: string) => markVehicleAsDelivered(vehicleId),
    onSuccess: () => {
      toast({
        description: "Voertuig gemarkeerd als afgeleverd"
      });
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
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

  const handleUpdatePaintStatus = (vehicleId: string, status: PaintStatus) => {
    updatePaintStatusMutation.mutate({ vehicleId, status });
  };

  const handleMarkAsDelivered = (vehicleId: string) => {
    markAsDeliveredMutation.mutate(vehicleId);
  };
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  // Sort vehicles based on sort field and direction
  const sortedVehicles = [...vehicles].sort((a, b) => {
    if (!sortField) return 0;
    
    // Handle nested fields
    let aValue: any = a;
    let bValue: any = b;
    
    const fields = sortField.split(".");
    for (const field of fields) {
      aValue = aValue?.[field];
      bValue = bValue?.[field];
    }
    
    if (aValue === undefined || bValue === undefined) return 0;
    
    // For numbers
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }
    
    // For strings
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }
    
    // For booleans
    if (typeof aValue === "boolean" && typeof bValue === "boolean") {
      return sortDirection === "asc" 
        ? (aValue === bValue ? 0 : aValue ? 1 : -1)
        : (aValue === bValue ? 0 : bValue ? 1 : -1);
    }
    
    return 0;
  });
  
  const toggleSelectVehicle = (vehicleId: string, checked: boolean) => {
    setSelectedVehicles(prev => 
      checked 
        ? [...prev, vehicleId]
        : prev.filter(id => id !== vehicleId)
    );
  };
  
  const toggleSelectAll = (checked: boolean) => {
    setSelectedVehicles(checked ? vehicles.map(v => v.id) : []);
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
      queryClient.invalidateQueries({ queryKey: ["b2cVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
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
          title="Verkocht B2C" 
          description="Beheer uw verkochte voertuigen aan particuliere klanten"
        >
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" disabled={selectedVehicles.length === 0}>
              <FileText className="h-4 w-4 mr-2" />
              Export selectie
            </Button>
            <Button variant="outline" size="sm" disabled={selectedVehicles.length === 0}>
              <Mail className="h-4 w-4 mr-2" />
              E-mail sturen
            </Button>
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nieuw voertuig
            </Button>
          </div>
        </PageHeader>
        
        <div className="bg-white rounded-md shadow">
          <VehicleB2CTable 
            vehicles={sortedVehicles}
            selectedVehicles={selectedVehicles}
            toggleSelectAll={toggleSelectAll}
            toggleSelectVehicle={toggleSelectVehicle}
            handleSelectVehicle={setSelectedVehicle}
            handleSendEmail={handleSendEmail}
            handleUpdateSellingPrice={handleUpdateSellingPrice}
            handleUpdatePaymentStatus={handleUpdatePaymentStatus}
            handleUpdatePaintStatus={handleUpdatePaintStatus}
            onMarkAsDelivered={handleMarkAsDelivered}
            handleChangeStatus={handleChangeStatus}
            isLoading={isLoading}
            error={error}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
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

export default InventoryB2C;
