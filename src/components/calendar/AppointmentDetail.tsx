
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { updateAppointment, deleteAppointment, sendAppointmentConfirmation } from "@/services/calendarService";
import { Appointment } from "@/types/calendar";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  User, 
  Car,
  Calendar,
  FileText,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AppointmentDetailProps {
  appointment: Appointment;
  onBack: () => void;
  onUpdate: (appointment: Appointment) => void;
  onDelete: () => void;
}

export const AppointmentDetail: React.FC<AppointmentDetailProps> = ({
  appointment,
  onBack,
  onUpdate,
  onDelete
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "gepland": return "bg-yellow-500";
      case "bevestigd": return "bg-green-500";
      case "uitgevoerd": return "bg-blue-500";
      case "geannuleerd": return "bg-red-500";
      case "no_show": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "proefrit": return "Proefrit";
      case "aflevering": return "Aflevering";
      case "ophalen": return "Ophalen";
      case "onderhoud": return "Onderhoud";
      case "intake": return "Intake";
      case "bezichtiging": return "Bezichtiging";
      case "overig": return "Overig";
      default: return type;
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setIsLoading(true);
    try {
      const updatedAppointment = await updateAppointment(appointment.id, {
        status: newStatus as any
      });
      onUpdate(updatedAppointment);
      toast({
        title: "Status bijgewerkt",
        description: `Afspraak status gewijzigd naar ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Fout",
        description: "Kon status niet bijwerken",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendConfirmation = async () => {
    setIsLoading(true);
    try {
      await sendAppointmentConfirmation(appointment.id);
      toast({
        title: "Bevestiging verstuurd",
        description: "Afspraakbevestiging is naar de klant gestuurd",
      });
    } catch (error) {
      console.error('Error sending confirmation:', error);
      toast({
        title: "Fout",
        description: "Kon bevestiging niet versturen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Weet je zeker dat je deze afspraak wilt verwijderen?")) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteAppointment(appointment.id);
      toast({
        title: "Afspraak verwijderd",
        description: "De afspraak is succesvol verwijderd",
      });
      onDelete();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Fout",
        description: "Kon afspraak niet verwijderen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{appointment.title}</h1>
            <p className="text-muted-foreground">
              {format(new Date(appointment.startTime), 'dd MMMM yyyy, HH:mm')} - 
              {format(new Date(appointment.endTime), 'HH:mm')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={`${getStatusColor(appointment.status)} text-white`}>
            {appointment.status}
          </Badge>
          <Badge variant="outline">
            {getTypeLabel(appointment.type)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Afspraakdetails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Titel</label>
                  <p className="text-base">{appointment.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="text-base">{getTypeLabel(appointment.type)}</p>
                </div>
              </div>

              {appointment.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Beschrijving</label>
                  <p className="text-base">{appointment.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Startdatum & tijd</label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <p className="text-base">{format(new Date(appointment.startTime), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Einddatum & tijd</label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <p className="text-base">{format(new Date(appointment.endTime), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                </div>
              </div>

              {appointment.location && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Locatie</label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <p className="text-base">{appointment.location}</p>
                  </div>
                </div>
              )}

              {appointment.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notities</label>
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-1" />
                    <p className="text-base">{appointment.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Details */}
          {appointment.customerName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Klantgegevens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Naam</label>
                    <p className="text-base">{appointment.customerName}</p>
                  </div>
                  {appointment.customerEmail && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">E-mail</label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${appointment.customerEmail}`} className="text-base text-blue-600 hover:underline">
                          {appointment.customerEmail}
                        </a>
                      </div>
                    </div>
                  )}
                  {appointment.customerPhone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefoon</label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${appointment.customerPhone}`} className="text-base text-blue-600 hover:underline">
                          {appointment.customerPhone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vehicle Details */}
          {appointment.vehicleBrand && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Voertuiggegevens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Merk</label>
                    <p className="text-base">{appointment.vehicleBrand}</p>
                  </div>
                  {appointment.vehicleModel && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Model</label>
                      <p className="text-base">{appointment.vehicleModel}</p>
                    </div>
                  )}
                </div>
                {appointment.vehicleLicenseNumber && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-muted-foreground">Kenteken</label>
                    <p className="text-base">{appointment.vehicleLicenseNumber}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Acties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleSendConfirmation}
                disabled={isLoading}
                className="w-full gap-2"
              >
                <Mail className="h-4 w-4" />
                Bevestiging Versturen
              </Button>

              <Button 
                variant="outline" 
                onClick={() => {/* TODO: Edit functionality */}}
                disabled={isLoading}
                className="w-full gap-2"
              >
                <Edit className="h-4 w-4" />
                Bewerken
              </Button>

              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isLoading}
                className="w-full gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Verwijderen
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Wijzigen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant={appointment.status === "bevestigd" ? "default" : "outline"}
                onClick={() => handleStatusUpdate("bevestigd")}
                disabled={isLoading || appointment.status === "bevestigd"}
                className="w-full gap-2"
                size="sm"
              >
                <CheckCircle className="h-4 w-4" />
                Bevestigen
              </Button>
              
              <Button 
                variant={appointment.status === "uitgevoerd" ? "default" : "outline"}
                onClick={() => handleStatusUpdate("uitgevoerd")}
                disabled={isLoading || appointment.status === "uitgevoerd"}
                className="w-full gap-2"
                size="sm"
              >
                <CheckCircle className="h-4 w-4" />
                Uitgevoerd
              </Button>

              <Button 
                variant={appointment.status === "geannuleerd" ? "destructive" : "outline"}
                onClick={() => handleStatusUpdate("geannuleerd")}
                disabled={isLoading || appointment.status === "geannuleerd"}
                className="w-full gap-2"
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
                Annuleren
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <label className="font-medium text-muted-foreground">Aangemaakt door</label>
                <p>{appointment.createdBy}</p>
              </div>
              {appointment.assignedTo && (
                <div>
                  <label className="font-medium text-muted-foreground">Toegewezen aan</label>
                  <p>{appointment.assignedTo}</p>
                </div>
              )}
              <div>
                <label className="font-medium text-muted-foreground">Aangemaakt op</label>
                <p>{format(new Date(appointment.createdAt), 'dd MMM yyyy, HH:mm')}</p>
              </div>
              <div>
                <label className="font-medium text-muted-foreground">Laatst gewijzigd</label>
                <p>{format(new Date(appointment.updatedAt), 'dd MMM yyyy, HH:mm')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
