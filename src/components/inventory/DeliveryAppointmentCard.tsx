import React, { useState } from "react";
import { CalendarCheck, Truck, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Vehicle } from "@/types/inventory";
import { createAppointment } from "@/services/calendarService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DeliveryAppointmentCardProps {
  vehicle: Vehicle;
  onAppointmentCreated: (appointmentId: string) => void;
  isReady?: boolean;
}

export const DeliveryAppointmentCard: React.FC<DeliveryAppointmentCardProps> = ({
  vehicle,
  onAppointmentCreated,
  isReady = true,
}) => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSchedule = async () => {
    if (!date || !user) return;

    setIsSubmitting(true);
    try {
      const [hours, minutes] = time.split(":").map(Number);
      const startTime = new Date(date);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      const appointment = await createAppointment({
        title: `Aflevering ${vehicle.brand} ${vehicle.model} - ${vehicle.customerName || "Klant"}`,
        description: `Aflevering voertuig ${vehicle.brand} ${vehicle.model} (${vehicle.licenseNumber || vehicle.vin})${notes ? `\n\nNotities: ${notes}` : ""}`,
        startTime,
        endTime,
        type: "aflevering",
        status: "gepland",
        customerId: vehicle.customerId,
        customerName: vehicle.customerName,
        customerEmail: vehicle.details?.customerEmail,
        vehicleId: vehicle.id,
        vehicleBrand: vehicle.brand,
        vehicleModel: vehicle.model,
        vehicleLicenseNumber: vehicle.licenseNumber,
        location: "Showroom",
        notes,
        createdBy: user.email || "Onbekend",
      });

      onAppointmentCreated(appointment.id);

      toast({
        title: "Afleverafspraak gepland!",
        description: `${format(startTime, "EEEE d MMMM yyyy 'om' HH:mm", { locale: nl })} — wordt gesynchroniseerd met Google Calendar.`,
      });
    } catch (error) {
      console.error("Failed to create delivery appointment:", error);
      toast({
        title: "Fout bij plannen",
        description: "Kon de afleverafspraak niet aanmaken. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn(
      isReady 
        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
        : "border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20"
    )}>
      <CardHeader>
        <CardTitle className={cn(
          "flex items-center gap-2",
          isReady ? "text-emerald-700 dark:text-emerald-400" : "text-orange-700 dark:text-orange-400"
        )}>
          <Truck className="h-5 w-5" />
          {isReady ? "Klaar voor levering!" : "Afleverafspraak inplannen"}
        </CardTitle>
        <CardDescription>
          {isReady 
            ? "Alle checks zijn afgerond en het voertuig is ingeschreven. Plan direct een afleverafspraak in — deze wordt automatisch gesynchroniseerd met Google Calendar."
            : "Let op: dit voertuig is nog niet volledig klaar voor aflevering. Je kunt alvast een afleverafspraak inplannen — deze wordt automatisch gesynchroniseerd met Google Calendar."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Datum</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  {date ? format(date, "EEEE d MMMM yyyy", { locale: nl }) : "Kies een datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tijd</label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Customer info */}
        {vehicle.customerName && (
          <div className="text-sm text-muted-foreground bg-background/60 rounded-md p-3">
            <span className="font-medium">Klant:</span> {vehicle.customerName}
            {vehicle.details?.customerEmail && (
              <span className="ml-2">({vehicle.details.customerEmail})</span>
            )}
          </div>
        )}

        {/* Notes */}
        <Textarea
          placeholder="Optionele notities voor de aflevering..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <Button
          onClick={handleSchedule}
          disabled={!date || isSubmitting}
          className={cn("w-full text-white", isReady ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-orange-700")}
        >
          <CalendarCheck className="h-4 w-4 mr-2" />
          {isSubmitting ? "Bezig met plannen..." : "Afleverafspraak inplannen"}
        </Button>
      </CardContent>
    </Card>
  );
};
