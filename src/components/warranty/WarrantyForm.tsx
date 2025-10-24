
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
import { CalendarIcon, Car, User, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Vehicle } from "@/types/inventory";
import { LoanCar, WarrantyClaim } from "@/types/warranty";
import { fetchLoanCars, createWarrantyClaim, updateWarrantyClaim } from "@/services/warrantyService";
import { fetchDeliveredVehiclesForWarranty } from "@/services/deliveredVehicleService";
import { createAppointment } from "@/services/calendarService";
import { toast } from "@/hooks/use-toast";
import { SearchableVehicleSelector } from "./SearchableVehicleSelector";

interface WarrantyFormProps {
  onClose: () => void;
}

export const WarrantyForm: React.FC<WarrantyFormProps> = ({ onClose }) => {
  const [inputMode, setInputMode] = useState<"existing" | "manual">("existing");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Manual input fields
  const [manualBrand, setManualBrand] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualCustomerPhone, setManualCustomerPhone] = useState("");
  const [manualLicenseNumber, setManualLicenseNumber] = useState("");
  
  const [problemDescription, setProblemDescription] = useState("");
  const [priority, setPriority] = useState<string>("normaal");
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [loanCarAssigned, setLoanCarAssigned] = useState(false);
  const [selectedLoanCar, setSelectedLoanCar] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Appointment scheduling state
  const [scheduleAppointment, setScheduleAppointment] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<Date>();
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentType, setAppointmentType] = useState<string>("onderhoud");
  const [appointmentNotes, setAppointmentNotes] = useState("");

  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["deliveredVehiclesForWarranty"],
    queryFn: fetchDeliveredVehiclesForWarranty
  });

  const { data: loanCars = [], isLoading: loanCarsLoading } = useQuery({
    queryKey: ["loanCars"],
    queryFn: fetchLoanCars
  });

  const availableLoanCars = loanCars.filter((car: LoanCar) => car.available);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate based on input mode
    if (inputMode === "existing" && !selectedVehicle) {
      toast({
        title: "Fout",
        description: "Selecteer een voertuig",
        variant: "destructive"
      });
      return;
    }

    if (inputMode === "manual") {
      if (!manualBrand.trim() || !manualModel.trim() || !manualCustomerName.trim()) {
        toast({
          title: "Fout",
          description: "Vul merk, model en klantnaam in",
          variant: "destructive"
        });
        return;
      }
    }

    if (!problemDescription.trim()) {
      toast({
        title: "Fout", 
        description: "Voer een probleemomschrijving in",
        variant: "destructive"
      });
      return;
    }

    if (scheduleAppointment && (!appointmentDate || !appointmentTime)) {
      toast({
        title: "Fout",
        description: "Vul alle afspraak gegevens in",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const claimData = inputMode === "existing" && selectedVehicle ? {
        vehicleId: selectedVehicle.id,
        customerId: selectedVehicle.customerId || "",
        customerName: selectedVehicle.customerName || "Onbekend",
        vehicleBrand: selectedVehicle.brand,
        vehicleModel: selectedVehicle.model,
        vehicleLicenseNumber: selectedVehicle.licenseNumber,
        vehicleVin: selectedVehicle.vin,
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
      } : {
        // Manual input mode
        vehicleId: null, // No vehicle ID for manual entries
        customerId: null,
        customerName: manualCustomerName,
        customerPhone: manualCustomerPhone || undefined,
        vehicleBrand: manualBrand,
        vehicleModel: manualModel,
        vehicleLicenseNumber: manualLicenseNumber || "N.v.t.",
        deliveryDate: new Date(),
        warrantyStartDate: new Date(),
        warrantyEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
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
        assignedTo: assignedTo || undefined,
        // Manual entry fields for database storage
        manualCustomerName: manualCustomerName,
        manualCustomerPhone: manualCustomerPhone || undefined,
        manualVehicleBrand: manualBrand,
        manualVehicleModel: manualModel,
        manualLicenseNumber: manualLicenseNumber || undefined
      };

      const createdClaim = await createWarrantyClaim(claimData);
      
      // Create appointment if requested
      if (scheduleAppointment && appointmentDate && appointmentTime) {
        const [hours, minutes] = appointmentTime.split(':');
        const startTime = new Date(appointmentDate);
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 1); // Default 1 hour appointment

        const vehicleBrand = inputMode === "existing" && selectedVehicle ? selectedVehicle.brand : manualBrand;
        const vehicleModel = inputMode === "existing" && selectedVehicle ? selectedVehicle.model : manualModel;
        const customerName = inputMode === "existing" && selectedVehicle ? selectedVehicle.customerName : manualCustomerName;

        const appointmentData = {
          title: `Garantie reparatie: ${vehicleBrand} ${vehicleModel}`,
          description: `Garantieclaim: ${problemDescription}`,
          startTime,
          endTime,
          type: appointmentType as any,
          status: "gepland" as any,
          customerId: inputMode === "existing" && selectedVehicle ? selectedVehicle.customerId : undefined,
          customerName: customerName || "Onbekend",
          customerEmail: inputMode === "existing" && selectedVehicle ? undefined : undefined,
          customerPhone: inputMode === "manual" ? manualCustomerPhone || undefined : undefined,
          vehicleId: inputMode === "existing" && selectedVehicle ? selectedVehicle.id : undefined,
          vehicleBrand,
          vehicleModel,
          vehicleLicenseNumber: inputMode === "existing" && selectedVehicle ? selectedVehicle.licenseNumber : manualLicenseNumber || "Onbekend",
          location: "Werkplaats",
          notes: `Garantieclaim ID: ${createdClaim.id}${appointmentNotes ? `\n${appointmentNotes}` : ''}`,
          createdBy: "Garantieafdeling",
          assignedTo: assignedTo || undefined
        };

        const createdAppointment = await createAppointment(appointmentData);
        
        // Update claim with appointment ID
        await updateWarrantyClaim(createdClaim.id, { appointmentId: createdAppointment.id });
        
        toast({
          title: "Succesvol",
          description: "Garantieclaim en afspraak zijn aangemaakt"
        });
      } else {
        toast({
          title: "Succesvol",
          description: "Garantieclaim is aangemaakt"
        });
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["warrantyClaims"] });
      queryClient.invalidateQueries({ queryKey: ["warrantyStats"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      
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
          {/* Input Mode Selection */}
          <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="existing"
                name="inputMode"
                value="existing"
                checked={inputMode === "existing"}
                onChange={(e) => setInputMode(e.target.value as "existing" | "manual")}
                className="w-4 h-4"
              />
              <Label htmlFor="existing" className="cursor-pointer font-medium">
                Selecteer voertuig uit systeem
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="manual"
                name="inputMode"
                value="manual"
                checked={inputMode === "manual"}
                onChange={(e) => setInputMode(e.target.value as "existing" | "manual")}
                className="w-4 h-4"
              />
              <Label htmlFor="manual" className="cursor-pointer font-medium">
                Voer handmatig in
              </Label>
            </div>
          </div>

          {inputMode === "existing" ? (
            <>
              <SearchableVehicleSelector
                value={selectedVehicle?.id}
                onValueChange={(vehicle) => setSelectedVehicle(vehicle)}
                vehicles={vehicles}
                label="Selecteer Voertuig *"
                placeholder="Zoek op kenteken, merk, model, VIN of klant..."
                loading={vehiclesLoading}
              />

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
            </>
          ) : (
            <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2 text-sm text-amber-800 mb-4">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Let op:</strong> Deze garantieclaim wordt niet gekoppeld aan een voertuig in het systeem.
                  Gebruik deze optie alleen voor eerdere verkopen die nog niet zijn geregistreerd.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manualBrand">Merk *</Label>
                  <Input
                    id="manualBrand"
                    placeholder="Bijv. Toyota"
                    value={manualBrand}
                    onChange={(e) => setManualBrand(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="manualModel">Model *</Label>
                  <Input
                    id="manualModel"
                    placeholder="Bijv. Yaris"
                    value={manualModel}
                    onChange={(e) => setManualModel(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manualCustomerName">Klantnaam *</Label>
                  <Input
                    id="manualCustomerName"
                    placeholder="Naam klant"
                    value={manualCustomerName}
                    onChange={(e) => setManualCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="manualCustomerPhone">Telefoonnummer</Label>
                  <Input
                    id="manualCustomerPhone"
                    type="tel"
                    placeholder="06-12345678"
                    value={manualCustomerPhone}
                    onChange={(e) => setManualCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="manualLicenseNumber">Kenteken</Label>
                <Input
                  id="manualLicenseNumber"
                  placeholder="XX-XX-XX"
                  value={manualLicenseNumber}
                  onChange={(e) => setManualLicenseNumber(e.target.value)}
                />
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

      {/* Appointment Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Afspraak Inplannen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="scheduleAppointment"
              checked={scheduleAppointment}
              onCheckedChange={setScheduleAppointment}
            />
            <Label htmlFor="scheduleAppointment">Afspraak inplannen voor reparatie</Label>
          </div>

          {scheduleAppointment && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Datum Afspraak</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !appointmentDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {appointmentDate ? format(appointmentDate, "dd MMMM yyyy", { locale: nl }) : "Selecteer datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={appointmentDate}
                        onSelect={setAppointmentDate}
                        initialFocus
                        className="pointer-events-auto"
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="appointmentTime">Tijd</Label>
                  <Input
                    id="appointmentTime"
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="appointmentType">Type Afspraak</Label>
                <Select value={appointmentType} onValueChange={setAppointmentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onderhoud">Onderhoud</SelectItem>
                    <SelectItem value="intake">Intake</SelectItem>
                    <SelectItem value="bezichtiging">Bezichtiging</SelectItem>
                    <SelectItem value="overig">Overig</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="appointmentNotes">Extra Opmerkingen Afspraak</Label>
                <Textarea
                  id="appointmentNotes"
                  placeholder="Specifieke instructies voor de afspraak..."
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            </div>
          )}
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
