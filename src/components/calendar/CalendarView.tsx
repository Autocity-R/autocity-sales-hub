
import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Appointment, CalendarView as CalendarViewType } from "@/types/calendar";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  List,
  Clock
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";

interface CalendarViewProps {
  appointments: Appointment[];
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  isLoading: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  appointments,
  view,
  onViewChange,
  onAppointmentClick,
  isLoading
}) => {
  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => isSameDay(new Date(apt.startTime), date));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subMonths(view.date, 1)
      : addMonths(view.date, 1);
    
    onViewChange({ ...view, date: newDate });
  };

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Laden...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(view.date, 'MMMM yyyy', { locale: nl })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
                Vorige
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewChange({ ...view, date: new Date() })}
              >
                Vandaag
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                Volgende
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={view.date}
            onSelect={(date) => date && onViewChange({ ...view, date })}
            className="w-full pointer-events-auto"
            locale={nl}
            modifiers={{
              hasAppointments: (date) => getAppointmentsForDate(date).length > 0
            }}
            modifiersStyles={{
              hasAppointments: {
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '2px solid rgb(59, 130, 246)'
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Selected Date Appointments */}
      {view.date && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Afspraken op {format(view.date, 'dd MMMM yyyy', { locale: nl })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const dayAppointments = getAppointmentsForDate(view.date);
              
              if (dayAppointments.length === 0) {
                return (
                  <p className="text-muted-foreground text-center py-8">
                    Geen afspraken op deze datum
                  </p>
                );
              }

              return (
                <div className="space-y-3">
                  {dayAppointments
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => onAppointmentClick(appointment)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{appointment.title}</h4>
                            <Badge className={`${getStatusColor(appointment.status)} text-white`}>
                              {appointment.status}
                            </Badge>
                            {appointment.leadId && (
                              <Badge variant="outline" className="text-xs">
                                Lead: {appointment.leadId}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              <strong>Tijd:</strong> {format(new Date(appointment.startTime), 'HH:mm')} - {format(new Date(appointment.endTime), 'HH:mm')}
                            </p>
                            <p><strong>Klant:</strong> {appointment.customerName}</p>
                            {appointment.vehicleBrand && (
                              <p>
                                <strong>Voertuig:</strong> {appointment.vehicleBrand} {appointment.vehicleModel}
                              </p>
                            )}
                            {appointment.location && (
                              <p><strong>Locatie:</strong> {appointment.location}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {getTypeLabel(appointment.type)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
