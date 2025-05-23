
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createAppointment } from "@/services/calendarService";
import { getLeads } from "@/services/leadService";
import { Appointment, AppointmentType, AppointmentStatus } from "@/types/calendar";
import { Lead } from "@/types/leads";
import { ArrowLeft, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AppointmentFormProps {
  appointment?: Appointment;
  onSave: () => void;
  onCancel: () => void;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  appointment,
  onSave,
  onCancel
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [formData, setFormData] = useState({
    title: appointment?.title || "",
    description: appointment?.description || "",
    type: appointment?.type || "proefrit" as AppointmentType,
    status: appointment?.status || "gepland" as AppointmentStatus,
    startDate: appointment?.startTime ? format(new Date(appointment.startTime), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    startTime: appointment?.startTime ? format(new Date(appointment.startTime), 'HH:mm') : "10:00",
    endDate: appointment?.endTime ? format(new Date(appointment.endTime), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    endTime: appointment?.endTime ? format(new Date(appointment.endTime), 'HH:mm') : "11:00",
    leadId: appointment?.leadId || "",
    customerName: appointment?.customerName || "",
    customerEmail: appointment?.customerEmail || "",
    customerPhone: appointment?.customerPhone || "",
    vehicleBrand: appointment?.vehicleBrand || "",
    vehicleModel: appointment?.vehicleModel || "",
    location: appointment?.location || "Showroom",
    notes: appointment?.notes || ""
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load leads on component mount
  useEffect(() => {
    const loadLeads = async () => {
      try {
        const leadsData = await getLeads();
        setLeads(leadsData);
      } catch (error) {
        console.error('Error loading leads:', error);
      }
    };
    loadLeads();
  }, []);

  // Auto-fill customer data when lead is selected
  const handleLeadSelect = (leadId: string) => {
    const selectedLead = leads.find(lead => lead.id === leadId);
    if (selectedLead) {
      setFormData(prev => ({
        ...prev,
        leadId: leadId,
        customerName: `${selectedLead.firstName} ${selectedLead.lastName}`,
        customerEmail: selectedLead.email,
        customerPhone: selectedLead.phone,
        vehicleBrand: selectedLead.interestedVehicle?.split(' ')[0] || "",
        vehicleModel: selectedLead.interestedVehicle?.split(' ').slice(1).join(' ') || "",
        title: prev.title || `${prev.type === 'proefrit' ? 'Proefrit' : 'Afspraak'} ${selectedLead.interestedVehicle || 'voertuig'}`
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      const appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        status: formData.status,
        startTime: startDateTime,
        endTime: endDateTime,
        leadId: formData.leadId || undefined,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        vehicleBrand: formData.vehicleBrand,
        vehicleModel: formData.vehicleModel,
        location: formData.location,
        notes: formData.notes,
        createdBy: "Gebruiker"
      };

      await createAppointment(appointmentData);
      
      toast({
        title: "Afspraak opgeslagen",
        description: "De afspraak is succesvol aangemaakt",
      });
      
      onSave();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast({
        title: "Fout",
        description: "Kon afspraak niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {appointment ? "Afspraak Bewerken" : "Nieuwe Afspraak"}
          </h1>
          <p className="text-muted-foreground">
            {appointment ? "Wijzig de afspraakgegevens" : "Maak een nieuwe afspraak aan"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Afspraakgegevens</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Bijv. Proefrit BMW X3"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as AppointmentType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proefrit">Proefrit</SelectItem>
                    <SelectItem value="aflevering">Aflevering</SelectItem>
                    <SelectItem value="ophalen">Ophalen</SelectItem>
                    <SelectItem value="onderhoud">Onderhoud</SelectItem>
                    <SelectItem value="intake">Intake</SelectItem>
                    <SelectItem value="bezichtiging">Bezichtiging</SelectItem>
                    <SelectItem value="overig">Overig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadId">Lead Koppelen</Label>
              <Select value={formData.leadId} onValueChange={handleLeadSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een lead (optioneel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Geen lead gekoppeld</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.firstName} {lead.lastName} - {lead.interestedVehicle || 'Geen voertuig'} ({lead.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.leadId && (
                <p className="text-sm text-muted-foreground">
                  Klantgegevens worden automatisch ingevuld vanuit de geselecteerde lead
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschrijving</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Aanvullende informatie over de afspraak"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Startdatum *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Starttijd *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Einddatum *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Eindtijd *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Klantnaam</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Naam van de klant"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">E-mail</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="klant@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">Telefoon</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="+31 6 12345678"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleBrand">Voertuig Merk</Label>
                <Input
                  id="vehicleBrand"
                  value={formData.vehicleBrand}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleBrand: e.target.value }))}
                  placeholder="BMW, Mercedes, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleModel">Model</Label>
                <Input
                  id="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleModel: e.target.value }))}
                  placeholder="X3, E-Class, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Locatie</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Showroom, Bij klant, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Extra notities voor deze afspraak"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Annuleren
              </Button>
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
