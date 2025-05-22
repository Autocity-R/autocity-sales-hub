
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { VehicleB2BTable } from "@/components/inventory/VehicleB2BTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Vehicle, PaymentStatus } from "@/types/inventory";
import { fetchB2BVehicles, sendEmail, updatePaymentStatus, updateVehicle } from "@/services/inventoryService";
import { useToast } from "@/hooks/use-toast";

const InventoryB2B = () => {
  const { toast } = useToast();
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string | null>("brand");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const { data: vehicles = [], isLoading, error, refetch } = useQuery({
    queryKey: ["b2bVehicles"],
    queryFn: fetchB2BVehicles,
  });

  const handleSendEmail = async (type: string, vehicleId: string) => {
    try {
      await sendEmail(type, [vehicleId]);
      toast({
        title: "Email verzonden",
        description: `De email is succesvol verzonden.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Er is iets misgegaan",
        description: "De email kon niet worden verzonden. Probeer het later opnieuw.",
      });
    }
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    // In a real app, this would navigate to a detail page
    console.log("Selected vehicle:", vehicle);
    
    // For demonstration, show toast
    toast({
      title: `${vehicle.brand} ${vehicle.model}`,
      description: "Details bekijken",
    });
  };

  const toggleSelectVehicle = (vehicleId: string, checked: boolean) => {
    if (checked) {
      setSelectedVehicles([...selectedVehicles, vehicleId]);
    } else {
      setSelectedVehicles(selectedVehicles.filter((id) => id !== vehicleId));
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVehicles(vehicles.map((vehicle) => vehicle.id));
    } else {
      setSelectedVehicles([]);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleUpdateSellingPrice = async (vehicleId: string, price: number) => {
    try {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        const updatedVehicle = { ...vehicle, sellingPrice: price };
        await updateVehicle(updatedVehicle);
        refetch();
        toast({
          title: "Prijs bijgewerkt",
          description: `De verkoopprijs is succesvol bijgewerkt.`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Er is iets misgegaan",
        description: "De prijs kon niet worden bijgewerkt. Probeer het later opnieuw.",
      });
    }
  };

  const handleUpdatePaymentStatus = async (vehicleId: string, status: PaymentStatus) => {
    try {
      await updatePaymentStatus(vehicleId, status);
      refetch();
      toast({
        title: "Betaalstatus bijgewerkt",
        description: `De betaalstatus is succesvol bijgewerkt.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Er is iets misgegaan",
        description: "De betaalstatus kon niet worden bijgewerkt. Probeer het later opnieuw.",
      });
    }
  };

  // Sort vehicles
  const sortedVehicles = [...vehicles].sort((a, b) => {
    if (!sortField) return 0;
    
    // Handle specific fields differently
    if (sortField === "mileage" || sortField === "sellingPrice") {
      const aValue = a[sortField] as number;
      const bValue = b[sortField] as number;
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }
    
    // Default string comparison
    const aValue = String(a[sortField as keyof Vehicle] || "");
    const bValue = String(b[sortField as keyof Vehicle] || "");
    
    return sortDirection === "asc" 
      ? aValue.localeCompare(bValue, "nl") 
      : bValue.localeCompare(aValue, "nl");
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">B2B Verkochte Voertuigen</h1>
          <div className="flex space-x-2">
            {selectedVehicles.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setSelectedVehicles([])}
              >
                Selectie opheffen ({selectedVehicles.length})
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Er is een fout opgetreden bij het laden van de voertuigen.
            </AlertDescription>
          </Alert>
        )}

        <VehicleB2BTable 
          vehicles={sortedVehicles}
          selectedVehicles={selectedVehicles}
          toggleSelectAll={toggleSelectAll}
          toggleSelectVehicle={toggleSelectVehicle}
          handleSelectVehicle={handleSelectVehicle}
          handleSendEmail={handleSendEmail}
          handleUpdateSellingPrice={handleUpdateSellingPrice}
          handleUpdatePaymentStatus={handleUpdatePaymentStatus}
          isLoading={isLoading}
          error={error}
          onSort={handleSort}
          sortField={sortField}
          sortDirection={sortDirection}
        />
      </div>
    </DashboardLayout>
  );
};

export default InventoryB2B;
