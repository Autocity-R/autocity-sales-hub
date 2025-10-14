
import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Car, Package, TrendingUp, AlertCircle } from "lucide-react";
import { VehicleTable } from "@/components/inventory/VehicleTable";
import { VehicleDetails } from "@/components/inventory/VehicleDetails";
import { VehicleForm } from "@/components/inventory/VehicleForm";
import { Vehicle, FileCategory } from "@/types/inventory";
import { fetchVehicles, fetchB2CVehicles, fetchB2BVehicles, getVehicleStats, updateVehicleStatus, markVehicleAsArrived, setUseMockData, createVehicle, updateVehicle, uploadVehicleFile, deleteVehicleFile, sendEmail } from "@/services/inventoryService";
import { DataSourceIndicator } from "@/components/common/DataSourceIndicator";
import { useToast } from "@/hooks/use-toast";
import { InventoryBulkActions } from "@/components/inventory/InventoryBulkActions";
import { supabase } from "@/integrations/supabase/client";
import { useVehiclesRealtime } from "@/hooks/useVehiclesRealtime";

const Inventory = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Enable real-time updates for all users
  useVehiclesRealtime();

  // Fetch all vehicles
  const { data: allVehicles = [], isLoading: isLoadingAll, error: errorAll } = useQuery({
    queryKey: ['vehicles', 'all'],
    queryFn: fetchVehicles,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Fetch B2C vehicles
  const { data: b2cVehicles = [], isLoading: isLoadingB2C, error: errorB2C } = useQuery({
    queryKey: ['vehicles', 'b2c'],
    queryFn: fetchB2CVehicles,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Fetch B2B vehicles
  const { data: b2bVehicles = [], isLoading: isLoadingB2B, error: errorB2B } = useQuery({
    queryKey: ['vehicles', 'b2b'],
    queryFn: fetchB2BVehicles,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Vehicle statistics
  const { data: stats } = useQuery({
    queryKey: ['vehicles', 'stats'],
    queryFn: getVehicleStats,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Get current vehicles based on active tab
  const currentVehicles = useMemo(() => {
    switch (activeTab) {
      case 'b2c':
        return b2cVehicles;
      case 'b2b':
        return b2bVehicles;
      default:
        // Filter out delivered vehicles from all vehicles view
        return allVehicles.filter(vehicle => vehicle.salesStatus !== 'afgeleverd');
    }
  }, [activeTab, allVehicles, b2cVehicles, b2bVehicles]);

  // Filter and sort vehicles
  const filteredAndSortedVehicles = useMemo(() => {
    let filtered = currentVehicles.filter(vehicle =>
      `${vehicle.brand} ${vehicle.model} ${vehicle.licenseNumber} ${vehicle.vin}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

    if (sortField) {
      filtered.sort((a, b) => {
        let aVal = a[sortField as keyof Vehicle];
        let bVal = b[sortField as keyof Vehicle];

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (sortDirection === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    }

    return filtered;
  }, [currentVehicles, searchTerm, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVehicles(filteredAndSortedVehicles.map(v => v.id));
    } else {
      setSelectedVehicles([]);
    }
  };

  const toggleSelectVehicle = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedVehicles([...selectedVehicles, id]);
    } else {
      setSelectedVehicles(selectedVehicles.filter(vid => vid !== id));
    }
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  // Mutation for sending emails
  const sendEmailMutation = useMutation({
    mutationFn: ({ type, vehicleId }: { type: string; vehicleId: string }) => 
      sendEmail(type, [vehicleId]),
    onSuccess: () => {
      toast({
        title: "Email verzonden",
        description: "De email is succesvol verzonden",
      });
    },
    onError: (error) => {
      console.error('Error sending email:', error);
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het verzenden van de email",
        variant: "destructive"
      });
    }
  });

  const handleSendEmail = (type: string, vehicleId: string) => {
    console.log(`Sending ${type} email for vehicle ${vehicleId}`);
    sendEmailMutation.mutate({ type, vehicleId });
  };

  const handleChangeStatus = async (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => {
    try {
      await updateVehicleStatus(vehicleId, status);
      
      // Refresh all vehicle queries
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      toast({
        title: "Status Updated",
        description: `Vehicle status changed to ${status}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update vehicle status",
        variant: "destructive"
      });
    }
  };

  const handleMarkAsArrived = async (vehicleId: string) => {
    try {
      await markVehicleAsArrived(vehicleId);
      
      // Refresh vehicle queries
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      toast({
        title: "Vehicle Arrived",
        description: "Vehicle has been marked as arrived",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark vehicle as arrived",
        variant: "destructive"
      });
    }
  };

  const handleDataSourceChange = (useMock: boolean) => {
    setIsUsingMockData(useMock);
    setUseMockData(useMock);
    // Refresh all queries when data source changes
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  };

  // Mutation for updating vehicle (manual save)
  const updateVehicleMutation = useMutation({
    mutationFn: updateVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setSelectedVehicle(null);
      toast({
        title: "Voertuig opgeslagen",
        description: "De voertuiggegevens zijn succesvol bijgewerkt",
      });
    },
    onError: (error) => {
      console.error('Error updating vehicle:', error);
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het opslaan",
        variant: "destructive"
      });
    }
  });

  // Mutation for auto-saving vehicle (no dialog close)
  const autoSaveVehicleMutation = useMutation({
    mutationFn: updateVehicle,
    onSuccess: (updatedVehicle) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      // Update the selected vehicle with saved data, don't close dialog
      setSelectedVehicle(updatedVehicle);
      toast({
        title: "Automatisch opgeslagen",
        description: "Wijzigingen zijn automatisch opgeslagen",
      });
    },
    onError: (error) => {
      console.error('Error auto-saving vehicle:', error);
      toast({
        title: "Auto-save fout",
        description: "Fout bij automatisch opslaan",
        variant: "destructive"
      });
    }
  });

  // Mutation for file upload
  const uploadFileMutation = useMutation({
    mutationFn: ({ file, category, vehicleId }: { file: File; category: FileCategory; vehicleId: string }) => 
      uploadVehicleFile(file, category, vehicleId),
    onSuccess: () => {
      if (selectedVehicle) {
        queryClient.invalidateQueries({ queryKey: ["vehicleFiles", selectedVehicle.id] });
      }
      toast({
        title: "Document geüpload",
        description: "Het document is succesvol toegevoegd aan het voertuig",
      });
    },
    onError: (error) => {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload fout",
        description: "Er is een fout opgetreden bij het uploaden van het document",
        variant: "destructive"
      });
    }
  });

  // Mutation for file deletion
  const deleteFileMutation = useMutation({
    mutationFn: ({ fileId, filePath }: { fileId: string; filePath: string }) => 
      deleteVehicleFile(fileId, filePath),
    onSuccess: () => {
      if (selectedVehicle) {
        queryClient.invalidateQueries({ queryKey: ["vehicleFiles", selectedVehicle.id] });
      }
      toast({
        title: "Document verwijderd",
        description: "Het document is succesvol verwijderd",
      });
    },
    onError: (error) => {
      console.error('Error deleting file:', error);
      toast({
        title: "Verwijder fout",
        description: "Er is een fout opgetreden bij het verwijderen van het document",
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (file: File, category: FileCategory) => {
    if (selectedVehicle) {
      uploadFileMutation.mutate({ file, category, vehicleId: selectedVehicle.id });
    }
  };

  const handleFileDelete = (fileId: string, filePath: string) => {
    deleteFileMutation.mutate({ fileId, filePath });
  };

  const handleUpdateVehicle = (vehicle: Vehicle) => {
    updateVehicleMutation.mutate(vehicle);
  };

  const handleAutoSave = (vehicle: Vehicle) => {
    autoSaveVehicleMutation.mutate(vehicle);
  };

  const handleBulkAction = async (action: string, value?: string) => {
    if (action === 'delete') {
      console.log(`[BULK_DELETE] Deleting ${selectedVehicles.length} vehicles from Inventory (voorraad menu)`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const vehicleId of selectedVehicles) {
        try {
          const { error } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', vehicleId);
          
          if (error) {
            console.error('[BULK_DELETE] Error deleting vehicle:', vehicleId, error);
            errorCount++;
          } else {
            console.log('[BULK_DELETE] Successfully deleted vehicle:', vehicleId);
            successCount++;
          }
        } catch (error) {
          console.error('[BULK_DELETE] Exception deleting vehicle:', vehicleId, error);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        toast({
          title: "Voertuigen verwijderd",
          description: `${successCount} voertuig(en) succesvol verwijderd uit alle lijsten`,
        });
      }
      
      if (errorCount > 0) {
        toast({
          title: "Fout bij verwijderen",
          description: `${errorCount} voertuig(en) konden niet worden verwijderd`,
          variant: "destructive"
        });
      }
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

  const isLoading = isLoadingAll || isLoadingB2C || isLoadingB2B;
  const hasError = errorAll || errorB2C || errorB2B;

  if (selectedVehicle) {
    return (
      <DashboardLayout>
        <VehicleDetails 
          vehicle={selectedVehicle} 
          onClose={() => setSelectedVehicle(null)}
          onUpdate={handleUpdateVehicle}
          onAutoSave={handleAutoSave}
          onSendEmail={handleSendEmail}
          onPhotoUpload={(file: File, isMain: boolean) => {
            console.log('Photo upload:', file, isMain);
          }}
          onRemovePhoto={(photoUrl: string) => {
            console.log('Remove photo:', photoUrl);
          }}
          onSetMainPhoto={(photoUrl: string) => {
            console.log('Set main photo:', photoUrl);
          }}
          onFileUpload={handleFileUpload}
          onFileDelete={handleFileDelete}
        />
      </DashboardLayout>
    );
  }

  if (showForm) {
    return (
      <DashboardLayout>
        <VehicleForm 
          onSubmit={async (vehicleData) => {
            try {
              await createVehicle(vehicleData);
              toast({ description: "Voertuig succesvol toegevoegd" });
              setShowForm(false);
              // Refresh all relevant lists
              queryClient.invalidateQueries({ queryKey: ['vehicles'] });
              queryClient.invalidateQueries({ queryKey: ['onlineVehicles'] });
              queryClient.invalidateQueries({ queryKey: ['b2cVehicles'] });
              queryClient.invalidateQueries({ queryKey: ['b2bVehicles'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            } catch (error) {
              console.error("Error creating vehicle:", error);
              toast({ variant: "destructive", description: "Fout bij het toevoegen van het voertuig" });
            }
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Voertuig Beheer"
          description="Beheer alle voertuigen in voorraad en verkocht"
        >
          <div className="flex gap-2">
            <InventoryBulkActions 
              selectedVehicles={selectedVehicles}
              onBulkAction={handleBulkAction}
            />
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuw Voertuig
            </Button>
          </div>
        </PageHeader>

        {/* Data Source Indicator */}
        <DataSourceIndicator 
          isUsingMockData={isUsingMockData}
          onDataSourceChange={handleDataSourceChange}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totaal Voorraad</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats?.total || 0) - (stats?.afgeleverd || 0)}</div>
              <p className="text-xs text-muted-foreground">
                voertuigen in systeem (excl. afgeleverd)
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Beschikbaar</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.voorraad || 0}</div>
              <p className="text-xs text-muted-foreground">
                klaar voor verkoop
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verkocht B2C</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.verkocht_b2c || 0}</div>
              <p className="text-xs text-muted-foreground">
                aan particulieren
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verkocht B2B</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats?.verkocht_b2b || 0}</div>
              <p className="text-xs text-muted-foreground">
                aan bedrijven
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {hasError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Connection Issues Detected</span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                Some data may be unavailable. Using fallback data where possible.
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="relative -mx-2 px-2 overflow-x-auto">
            <TabsList className="min-w-max">
              <TabsTrigger value="all">Alle Voertuigen ({allVehicles.filter(v => v.salesStatus !== 'afgeleverd').length})</TabsTrigger>
              <TabsTrigger value="b2c">B2C Verkocht ({b2cVehicles.length})</TabsTrigger>
              <TabsTrigger value="b2b">B2B Verkocht ({b2bVehicles.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="space-y-4">
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
                  {filteredAndSortedVehicles.length} resultaten
                </Badge>
                {selectedVehicles.length > 0 && (
                  <Badge variant="secondary">
                    {selectedVehicles.length} geselecteerd
                  </Badge>
                )}
              </div>
            </div>

            {/* Vehicle Table */}
            <VehicleTable
              vehicles={filteredAndSortedVehicles}
              selectedVehicles={selectedVehicles}
              toggleSelectAll={toggleSelectAll}
              toggleSelectVehicle={toggleSelectVehicle}
              handleSelectVehicle={handleSelectVehicle}
              handleSendEmail={handleSendEmail}
              handleChangeStatus={handleChangeStatus}
              handleMarkAsArrived={handleMarkAsArrived}
              isLoading={isLoading}
              error={hasError}
              onSort={handleSort}
              sortField={sortField}
              sortDirection={sortDirection}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;
