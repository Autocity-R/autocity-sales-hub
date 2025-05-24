
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Appointment } from "@/types/calendar";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User,
  Car
} from "lucide-react";
import { 
  format, 
  addWeeks, 
  subWeeks, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay,
  isToday 
} from "date-fns";
import { nl } from "date-fns/locale";

interface WeekViewProps {
  appointments: Appointment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  isLoading: boolean;
}

export const WeekView: React.FC<WeekViewProps> = ({
  appointments,
  currentDate,
  onDateChange,
  onAppointmentClick,
  isLoading
}) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start op maandag
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subWeeks(currentDate, 1)
      : addWeeks(currentDate, 1);
    
    onDateChange(newDate);
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments
      .filter(apt => isSameDay(new Date(apt.startTime), date))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "gepland": return "Gepland";
      case "bevestigd": return "Bevestigd";
      case "uitgevoerd": return "Uitgevoerd";
      case "geannuleerd": return "Geannuleerd";
      case "no_show": return "No Show";
      default: return status;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "proefrit": return "border-l-blue-500";
      case "aflevering": return "border-l-green-500";
      case "ophalen": return "border-l-orange-500";
      case "onderhoud": return "border-l-purple-500";
      case "intake": return "border-l-indigo-500";
      case "bezichtiging": return "border-l-pink-500";
      default: return "border-l-gray-500";
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
      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Week van {format(weekStart, 'dd MMM', { locale: nl })} - {format(weekEnd, 'dd MMM yyyy', { locale: nl })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
                Vorige week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDateChange(new Date())}
              >
                Deze week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                Volgende week
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Week Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayAppointments = getAppointmentsForDate(day);
          const isCurrentDay = isToday(day);
          
          return (
            <Card key={day.toISOString()} className={isCurrentDay ? "ring-2 ring-primary" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm text-center ${isCurrentDay ? "text-primary font-bold" : ""}`}>
                  {format(day, 'EEEE', { locale: nl })}
                  <div className={`text-lg ${isCurrentDay ? "text-primary" : ""}`}>
                    {format(day, 'dd MMM', { locale: nl })}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 min-h-[250px]">
                  {dayAppointments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Geen afspraken
                    </p>
                  ) : (
                    dayAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className={`p-3 border-l-4 ${getTypeColor(appointment.type)} bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors`}
                        onClick={() => onAppointmentClick(appointment)}
                      >
                        <div className="space-y-2">
                          {/* Time and Status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs font-medium">
                                {format(new Date(appointment.startTime), 'HH:mm')}
                              </span>
                            </div>
                            <Badge 
                              className={`${getStatusColor(appointment.status)} text-white text-xs`}
                              style={{ fontSize: '10px', padding: '1px 4px' }}
                            >
                              {getStatusLabel(appointment.status)}
                            </Badge>
                          </div>
                          
                          {/* Appointment Type */}
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(appointment.type)}
                            </Badge>
                            {appointment.leadId && (
                              <Badge variant="secondary" className="text-xs">
                                Lead
                              </Badge>
                            )}
                          </div>
                          
                          {/* Title */}
                          <h4 className="text-xs font-semibold truncate" title={appointment.title}>
                            {appointment.title}
                          </h4>
                          
                          {/* Customer */}
                          {appointment.customerName && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground truncate" title={appointment.customerName}>
                                {appointment.customerName}
                              </p>
                            </div>
                          )}
                          
                          {/* Vehicle */}
                          {appointment.vehicleBrand && (
                            <div className="flex items-center gap-1">
                              <Car className="h-3 w-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground truncate">
                                {appointment.vehicleBrand} {appointment.vehicleModel}
                              </p>
                            </div>
                          )}

                          {/* Location */}
                          {appointment.location && (
                            <p className="text-xs text-muted-foreground truncate" title={appointment.location}>
                              📍 {appointment.location}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
