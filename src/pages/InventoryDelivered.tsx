
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { FileText, Search, Filter } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { VehicleDeliveredTable } from "@/components/inventory/VehicleDeliveredTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Vehicle } from "@/types/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { fetchDeliveredVehicles } from "@/services/inventoryService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const InventoryDelivered = () => {
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  
  // Fetch delivered vehicles
  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ["deliveredVehicles"],
    queryFn: fetchDeliveredVehicles
  });
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  // Filter vehicles based on search query and filters
  const filteredVehicles = vehicles.filter(vehicle => {
    // Search query filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchFields = [
        vehicle.brand,
        vehicle.model,
        vehicle.licenseNumber,
        vehicle.customerName || "",
      ];
      if (!searchFields.some(field => field.toLowerCase().includes(query))) {
        return false;
      }
    }
    
    // Customer type filtering
    if (customerTypeFilter !== "all") {
      if (customerTypeFilter === "b2c" && vehicle.salesStatus !== "verkocht_b2c") {
        return false;
      }
      if (customerTypeFilter === "b2b" && vehicle.salesStatus !== "verkocht_b2b") {
        return false;
      }
    }
    
    // Date filtering
    if (dateFilter && vehicle.deliveryDate) {
      const deliveryDate = new Date(vehicle.deliveryDate);
      if (
        deliveryDate.getFullYear() !== dateFilter.getFullYear() ||
        deliveryDate.getMonth() !== dateFilter.getMonth()
      ) {
        return false;
      }
    }
    
    return true;
  });
  
  // Sort vehicles based on sort field and direction
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
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
    
    // For dates
    if (aValue instanceof Date && bValue instanceof Date) {
      return sortDirection === "asc" 
        ? aValue.getTime() - bValue.getTime() 
        : bValue.getTime() - aValue.getTime();
    }
    
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
    setSelectedVehicles(checked ? sortedVehicles.map(v => v.id) : []);
  };
  
  const formatDeliveryDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "d MMMM yyyy", { locale: nl });
  };
  
  const clearFilters = () => {
    setSearchQuery("");
    setCustomerTypeFilter("all");
    setDateFilter(null);
  };
  
  // Show active filters count
  const activeFiltersCount = [
    searchQuery !== "",
    customerTypeFilter !== "all",
    dateFilter !== null,
  ].filter(Boolean).length;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader 
          title="Afgeleverd" 
          description="Overzicht van afgeleverde voertuigen aan zakelijke en particuliere klanten"
        >
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" disabled={selectedVehicles.length === 0}>
              <FileText className="h-4 w-4 mr-2" />
              Export selectie
            </Button>
          </div>
        </PageHeader>
        
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center mb-4">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Zoeken op kenteken, klant, merk..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Filters */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Filter className="h-4 w-4 mr-1" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Klanttype</h4>
                  <Select
                    value={customerTypeFilter}
                    onValueChange={setCustomerTypeFilter}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Alle klanttypes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle klanttypes</SelectItem>
                      <SelectItem value="b2c">B2C (Particulier)</SelectItem>
                      <SelectItem value="b2b">B2B (Zakelijk)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Aflevermaand</h4>
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    className="rounded-md border p-3 pointer-events-auto"
                    classNames={{
                      day_selected: "bg-primary text-primary-foreground"
                    }}
                  />
                </div>
                
                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Filters wissen
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="bg-white rounded-md shadow">
          <VehicleDeliveredTable 
            vehicles={sortedVehicles}
            selectedVehicles={selectedVehicles}
            toggleSelectAll={toggleSelectAll}
            toggleSelectVehicle={toggleSelectVehicle}
            formatDeliveryDate={formatDeliveryDate}
            isLoading={isLoading}
            error={error}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InventoryDelivered;
