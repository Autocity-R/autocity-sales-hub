import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { VehicleB2BTable } from "@/components/inventory/VehicleB2BTable";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Vehicle, PaymentStatus } from "@/types/inventory";
import { fetchVehicles, updateVehiclePaymentStatus, updateVehicleSellingPrice } from "@/services/inventoryService";

const InventoryB2B = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { toast } = useToast();
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchVehicles("b2b");
      setVehicles(data);
    } catch (error) {
      setError(error);
      toast({
        title: "Error",
        description: "Failed to load vehicles.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allVehicleIds = vehicles.map((vehicle) => vehicle.id);
      setSelectedVehicles(allVehicleIds);
    } else {
      setSelectedVehicles([]);
    }
  };

  const toggleSelectVehicle = (vehicleId: string, checked: boolean) => {
    if (checked) {
      setSelectedVehicles([...selectedVehicles, vehicleId]);
    } else {
      setSelectedVehicles(selectedVehicles.filter((id) => id !== vehicleId));
    }
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setOpen(true);
  };

  const handleSendEmail = async (type: string, vehicleId: string) => {
    // Placeholder for send email function
    toast({
      title: "Email sent",
      description: `Email of type ${type} sent for vehicle ${vehicleId}.`,
    });
  };

  const handleUpdateSellingPrice = async (vehicleId: string, price: number) => {
    try {
      await updateVehicleSellingPrice(vehicleId, price);
      toast({
        title: "Success",
        description: "Selling price updated successfully.",
      });
      loadVehicles(); // Refresh the vehicle list
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update selling price.",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePaymentStatus = async (vehicleId: string, status: PaymentStatus) => {
    try {
      await updateVehiclePaymentStatus(vehicleId, status);
      toast({
        title: "Success",
        description: "Payment status updated successfully.",
      });
      loadVehicles(); // Refresh the vehicle list
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment status.",
        variant: "destructive",
      });
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }

    const sortedVehicles = [...vehicles].sort((a, b) => {
      const aValue = a[field as keyof Vehicle];
      const bValue = b[field as keyof Vehicle];

      if (aValue === null || aValue === undefined) return sortDirection === "asc" ? -1 : 1;
      if (bValue === null || bValue === undefined) return sortDirection === "asc" ? 1 : -1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return 0;
    });

    setVehicles(sortedVehicles);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-10">
        <div className="mb-4 flex items-center space-x-2">
          <Link to="/inventory" className="text-blue-500 hover:underline">
            Terug naar overzicht
          </Link>
          <h1 className="text-2xl font-bold">B2B Verkochte Voertuigen</h1>
        </div>

        <VehicleB2BTable
          vehicles={vehicles}
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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Voertuig Details</DialogTitle>
              <DialogDescription>
                Details van het geselecteerde voertuig.
              </DialogDescription>
            </DialogHeader>
            {selectedVehicle ? (
              <div>
                <p>Merk: {selectedVehicle.brand}</p>
                <p>Model: {selectedVehicle.model}</p>
                {/* Add more details here */}
              </div>
            ) : (
              <p>Geen voertuig geselecteerd.</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default InventoryB2B;
