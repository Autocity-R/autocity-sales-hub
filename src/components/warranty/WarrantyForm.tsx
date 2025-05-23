
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon, Car, User, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Vehicle } from "@/types/inventory";
import { LoanCar, WarrantyClaim } from "@/types/warranty";
import { fetchDeliveredVehiclesForWarranty, fetchLoanCars, createWarrantyClaim } from "@/services/warrantyService";
import { toast } from "@/hooks/use-toast";

interface WarrantyFormProps {
  onClose: () => void;
}

export const WarrantyForm: React.FC<WarrantyFormProps> = ({ onClose }) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [problemDescription, setProblemDescription] = useState("");
  const [priority, setPriority] = useState<string>("normaal");
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [loanCarAssigned, setLoanCarAssigned] = useState(false);
  const [selectedLoanCar, setSelectedLoanCar] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Fetch delivered vehicles for warranty
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["deliveredVehiclesForWarranty"],
    queryFn: fetchDeliveredVehiclesForWarranty
  });

  // Fetch available loan cars
  const { data: loanCars = [], isLoading: loanCarsLoading } = useQuery({
    queryKey: ["loanCars"],
    queryFn: fetchLoanCars
  });

  const availableLoanCars = loanCars.filter((car: LoanCar) => car.available);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVehicle) {
      toast({
        title: "Fout",
        description: "Selecteer een voertuig",
        variant: "destructive"
      });
      return;
    }

    if (!problemDescription.trim()) {
      toast({
        title: "Fout", 
        description: "Voer een probleemomschrijving in",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const claimData = {
        vehicleId: selectedVehicle.id,
        customerId: selectedVehicle.customerId || "",
        customerName: selectedVehicle.customerName || "Onbekend",
        vehicleBrand: selectedVehicle.brand,
        vehicleModel: selectedVehicle.model,
        vehicleLicenseNumber: selectedVehicle.licenseNumber,
        deliveryDate: selectedVehicle.deliveryDate || new Date(),
        warrantyStartDate: selectedVehicle.deliveryDate || new Date(),
        warrantyEndDate: new Date(new Date(selectedVehicle.deliveryDate || new Date()).setFullYear(new Date().getFullYear() + 1)),
        problemDescription,
        reportDate,
        status: "actief" as const,
        priority: priority as any,
        loanCarAssigned,
        loanCarId: loanCarAssigned ? selectedLoanCar : undefined,
        loanCarDetails: loanCarAssigned ? loanCars.find((car: LoanCar) => car.id === selectedLoanCar) : undefined,
        estimatedCost,
        additionalNotes,
        attachments: [],
        assignedTo: assignedTo || undefined
      };

      await createWarrantyClaim(claimData);
      
      // Invalidate warranty claims query to refresh data
      queryClient.invalidateQueries({ queryKey: ["warrantyClaims"] });
      queryClient.invalidateQueries({ queryKey: ["warrantyStats"] });
      
      toast({
        title: "Succesvol",
        description: "Garantieclaim is aangemaakt"
      });
      
      onClose();
    } catch (error) {
      console.error("Failed to create warranty claim:", error);
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het aanmaken van de claim",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWarrantyEndDate = (deliveryDate: Date | string | null) => {
    if (!deliveryDate) return "Onbekend";
    const endDate = new Date(deliveryDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    return format(endDate, "dd MMMM yyyy", { locale: nl });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vehicle Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Voertuig Selectie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="vehicle">Selecteer Voertuig</Label>
            <Select
              value={selectedVehicle?.id || ""}
              onValueChange={(value) => {
                const vehicle = vehicles.find((v: Vehicle) => v.id === value);
                setSelectedVehicle(vehicle || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kies een afgeleverd voertuig..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle: Vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{vehicle.brand} {vehicle.model} - {vehicle.licenseNumber}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {vehicle.customerName}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedVehicle && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Klant:</span> {selectedVehicle.customerName}
                </div>
                <div>
                  <span className="font-medium">Afgeleverd:</span> {
                    selectedVehicle.deliveryDate 
                      ? format(new Date(selectedVehicle.deliveryDate), "dd MMMM yyyy", { locale: nl })
                      : "Onbekend"
                  }
                </div>
                <div>
                  <span className="font-medium">Garantie t/m:</span> {getWarrantyEndDate(selectedVehicle.deliveryDate)}
                </div>
                <div>
                  <span className="font-medium">VIN:</span> {selectedVehicle.vin}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Problem Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Probleem Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="problem">Probleemomschrijving *</Label>
            <Textarea
              id="problem"
              placeholder="Beschrijf het probleem in detail..."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Prioriteit</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="laag">Laag</SelectItem>
                  <SelectItem value="normaal">Normaal</SelectItem>
                  <SelectItem value="hoog">Hoog</SelectItem>
                  <SelectItem value="kritiek">Kritiek</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Datum Aanmelding</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !reportDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {reportDate ? format(reportDate, "dd MMMM yyyy", { locale: nl }) : "Selecteer datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reportDate}
                    onSelect={(date) => date && setReportDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="estimatedCost">Geschatte Kosten (€)</Label>
            <Input
              id="estimatedCost"
              type="number"
              min="0"
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loan Car */}
      <Card>
        <CardHeader>
          <CardTitle>Leenauto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="loanCar"
              checked={loanCarAssigned}
              onCheckedChange={setLoanCarAssigned}
            />
            <Label htmlFor="loanCar">Leenauto toewijzen</Label>
          </div>

          {loanCarAssigned && (
            <div>
              <Label htmlFor="loanCarSelect">Selecteer Leenauto</Label>
              <Select value={selectedLoanCar} onValueChange={setSelectedLoanCar}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies een beschikbare leenauto..." />
                </SelectTrigger>
                <SelectContent>
                  {availableLoanCars.map((car: LoanCar) => (
                    <SelectItem key={car.id} value={car.id}>
                      {car.brand} {car.model} - {car.licenseNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableLoanCars.length === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Geen leenauto's beschikbaar
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Aanvullende Informatie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="assignedTo">Toegewezen aan</Label>
            <Input
              id="assignedTo"
              placeholder="Naam van mechanic of team..."
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notes">Extra Opmerkingen</Label>
            <Textarea
              id="notes"
              placeholder="Aanvullende informatie..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Annuleren
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Aanmaken..." : "Claim Aanmaken"}
        </Button>
      </div>
    </form>
  );
};
