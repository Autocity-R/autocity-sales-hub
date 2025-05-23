
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Appointment } from "@/types/calendar";
import { format } from "date-fns";
import { Search, Filter, RefreshCw, Calendar, Clock, User, Car } from "lucide-react";

interface AppointmentsListProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onRefresh: () => void;
}

export const AppointmentsList: React.FC<AppointmentsListProps> = ({
  appointments,
  onAppointmentClick,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

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

  // Filter appointments based on search and filters
  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = searchQuery === "" || 
      appointment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.vehicleBrand?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;
    const matchesType = typeFilter === "all" || appointment.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters en Zoeken
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op titel, klant of voertuig..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="gepland">Gepland</SelectItem>
                <SelectItem value="bevestigd">Bevestigd</SelectItem>
                <SelectItem value="uitgevoerd">Uitgevoerd</SelectItem>
                <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle types</SelectItem>
                <SelectItem value="proefrit">Proefrit</SelectItem>
                <SelectItem value="aflevering">Aflevering</SelectItem>
                <SelectItem value="ophalen">Ophalen</SelectItem>
                <SelectItem value="onderhoud">Onderhoud</SelectItem>
                <SelectItem value="intake">Intake</SelectItem>
                <SelectItem value="bezichtiging">Bezichtiging</SelectItem>
                <SelectItem value="overig">Overig</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={onRefresh} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Vernieuwen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Afspraken ({filteredAppointments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Geen afspraken gevonden</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all" 
                  ? "Probeer je filters aan te passen" 
                  : "Er zijn nog geen afspraken ingepland"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppointments
                .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
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
                        <Badge variant="outline">
                          {getTypeLabel(appointment.type)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(new Date(appointment.startTime), 'dd MMM yyyy, HH:mm')} - 
                            {format(new Date(appointment.endTime), 'HH:mm')}
                          </span>
                        </div>
                        
                        {appointment.customerName && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{appointment.customerName}</span>
                          </div>
                        )}
                        
                        {appointment.vehicleBrand && (
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4" />
                            <span>{appointment.vehicleBrand} {appointment.vehicleModel}</span>
                          </div>
                        )}
                      </div>
                      
                      {appointment.location && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          <strong>Locatie:</strong> {appointment.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
