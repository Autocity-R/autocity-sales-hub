
import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Vehicle } from "@/types/inventory";
import { fetchVehicles, fetchB2CVehicles, fetchB2BVehicles, getVehicleStats, updateVehicleStatus, markVehicleAsArrived, setUseMockData } from "@/services/inventoryService";
import { DataSourceIndicator } from "@/components/common/DataSourceIndicator";
import { useToast } from "@/hooks/use-toast";

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
        return allVehicles;
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

  const handleSendEmail = (type: string, vehicleId: string) => {
    toast({
      title: "Email Sent",
      description: `${type} email sent for vehicle ${vehicleId}`,
    });
  };

  const handleChangeStatus = async (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => {
    try {
      await updateVehicleStatus(vehicleId, status);
      
      // Refresh all vehicle queries
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
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

  const isLoading = isLoadingAll || isLoadingB2C || isLoadingB2B;
  const hasError = errorAll || errorB2C || errorB2B;

  if (selectedVehicle) {
    return (
      <DashboardLayout>
        <VehicleDetails 
          vehicle={selectedVehicle} 
          onClose={() => setSelectedVehicle(null)}
          onUpdate={(updatedVehicle) => {
            setSelectedVehicle(updatedVehicle);
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          }}
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
        />
      </DashboardLayout>
    );
  }

  if (showForm) {
    return (
      <DashboardLayout>
        <VehicleForm 
          onSubmit={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
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
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nieuw Voertuig
          </Button>
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
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                voertuigen in systeem
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
          <TabsList>
            <TabsTrigger value="all">Alle Voertuigen ({allVehicles.length})</TabsTrigger>
            <TabsTrigger value="b2c">B2C Verkocht ({b2cVehicles.length})</TabsTrigger>
            <TabsTrigger value="b2b">B2B Verkocht ({b2bVehicles.length})</TabsTrigger>
          </TabsList>

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
