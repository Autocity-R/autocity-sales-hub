
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarView } from "@/components/calendar/CalendarView";
import { WeekView } from "@/components/calendar/WeekView";
import { AppointmentForm } from "@/components/calendar/AppointmentForm";
import { AppointmentsList } from "@/components/calendar/AppointmentsList";
import { CalendarAIAssistant } from "@/components/calendar/CalendarAIAssistant";
import { AppointmentDetail } from "@/components/calendar/AppointmentDetail";
import { GoogleCalendarSync } from "@/components/calendar/GoogleCalendarSync";
import { CalendarSyncStatus } from "@/components/calendar/CalendarSyncStatus";
import { fetchAppointments } from "@/services/calendarService";
import { Appointment, CalendarView as CalendarViewType } from "@/types/calendar";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  List, 
  Bot,
  RefreshCw,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay, endOfDay, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";

const Calendar = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showGoogleSync, setShowGoogleSync] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarViewType>({
    type: "month",
    date: new Date()
  });
  const { toast } = useToast();

  // Load appointments
  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const startDate = subDays(calendarView.date, 30);
      const endDate = addDays(calendarView.date, 30);
      const data = await fetchAppointments(startDate, endDate);
      setAppointments(data);
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon afspraken niet laden",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [calendarView.date]);

  // Get stats for dashboard cards
  const todayAppointments = appointments.filter(apt => {
    const today = startOfDay(new Date());
    const tomorrow = endOfDay(new Date());
    const aptDate = new Date(apt.startTime);
    return aptDate >= today && aptDate <= tomorrow;
  });

  // Get this week's appointments
  const thisWeekAppointments = appointments.filter(apt => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const aptDate = new Date(apt.startTime);
    return aptDate >= weekStart && aptDate <= weekEnd;
  });

  const confirmedAppointments = appointments.filter(apt => apt.status === "bevestigd");
  const pendingAppointments = appointments.filter(apt => apt.status === "gepland");
  
  // Now these will show actual synced/pending counts
  const syncedAppointments = appointments.filter(apt => apt.sync_status === "synced");
  const pendingSyncAppointments = appointments.filter(apt => apt.sync_status === "pending");

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

  if (selectedAppointment) {
    return (
      <DashboardLayout>
        <AppointmentDetail
          appointment={selectedAppointment}
          onBack={() => setSelectedAppointment(null)}
          onUpdate={(updated) => {
            setSelectedAppointment(updated);
            loadAppointments();
          }}
          onDelete={() => {
            setSelectedAppointment(null);
            loadAppointments();
          }}
        />
      </DashboardLayout>
    );
  }

  if (showForm) {
    return (
      <DashboardLayout>
        <AppointmentForm
          onSave={() => {
            setShowForm(false);
            loadAppointments();
          }}
          onCancel={() => setShowForm(false)}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Agenda"
          description="Beheer alle afspraken met Google Calendar integratie"
        >
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowGoogleSync(true)} 
              variant="outline" 
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Google Calendar
              {googleCalendarConnected && (
                <Badge variant="outline" className="text-green-700 border-green-300">
                  <CheckCircle className="h-3 w-3" />
                </Badge>
              )}
            </Button>
            <Button 
              onClick={() => setShowAIAssistant(true)} 
              variant="outline" 
              className="gap-2"
            >
              <Bot className="h-4 w-4" />
              AI Assistent
            </Button>
            <Button onClick={loadAppointments} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Vernieuwen
            </Button>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuwe Afspraak
            </Button>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vandaag</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{todayAppointments.length}</div>
              <p className="text-xs text-muted-foreground">afspraken</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bevestigd</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{confirmedAppointments.length}</div>
              <p className="text-xs text-muted-foreground">deze week</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In behandeling</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingAppointments.length}</div>
              <p className="text-xs text-muted-foreground">wacht op bevestiging</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Google Sync</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{syncedAppointments.length}</div>
              <p className="text-xs text-muted-foreground">gesynchroniseerd</p>
              {pendingSyncAppointments.length > 0 && (
                <p className="text-xs text-orange-600">{pendingSyncAppointments.length} wachten</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totaal</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
              <p className="text-xs text-muted-foreground">deze maand</p>
            </CardContent>
          </Card>
        </div>

        {/* Google Calendar Sync Status */}
        {showGoogleSync && (
          <GoogleCalendarSync
            onSyncStatusChange={setGoogleCalendarConnected}
          />
        )}

        {/* Main Calendar Content */}
        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar">Kalender</TabsTrigger>
            <TabsTrigger value="week">Deze Week</TabsTrigger>
            <TabsTrigger value="list">Lijst</TabsTrigger>
            <TabsTrigger value="today">Vandaag</TabsTrigger>
            <TabsTrigger value="sync">Sync Status</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <CalendarView
              appointments={appointments}
              view={calendarView}
              onViewChange={setCalendarView}
              onAppointmentClick={setSelectedAppointment}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="week">
            <WeekView
              appointments={thisWeekAppointments}
              currentDate={new Date()}
              onDateChange={(date) => setCalendarView({ ...calendarView, date })}
              onAppointmentClick={setSelectedAppointment}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="list">
            <AppointmentsList
              appointments={appointments}
              onAppointmentClick={setSelectedAppointment}
              onRefresh={loadAppointments}
            />
          </TabsContent>

          <TabsContent value="today">
            <Card>
              <CardHeader>
                <CardTitle>Afspraken Vandaag - {format(new Date(), 'dd MMMM yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                {todayAppointments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Geen afspraken vandaag
                  </p>
                ) : (
                  <div className="space-y-4">
                    {todayAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedAppointment(appointment)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{appointment.title}</h3>
                            <Badge className={`${getStatusColor(appointment.status)} text-white`}>
                              {appointment.status}
                            </Badge>
                            <Badge variant="outline">
                              {getTypeLabel(appointment.type)}
                            </Badge>
                            <CalendarSyncStatus
                              appointmentId={appointment.id}
                              googleEventId={appointment.googleEventId}
                              syncStatus={appointment.sync_status || 'pending'}
                              onSyncComplete={loadAppointments}
                            />
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Tijd:</strong> {format(new Date(appointment.startTime), 'HH:mm')} - {format(new Date(appointment.endTime), 'HH:mm')}</p>
                            <p><strong>Klant:</strong> {appointment.customerName}</p>
                            {appointment.vehicleBrand && (
                              <p><strong>Voertuig:</strong> {appointment.vehicleBrand} {appointment.vehicleModel}</p>
                            )}
                            {appointment.location && (
                              <p><strong>Locatie:</strong> {appointment.location}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync">
            <Card>
              <CardHeader>
                <CardTitle>Google Calendar Synchronisatie Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!googleCalendarConnected ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <AlertCircle className="h-4 w-4" />
                        <strong>Google Calendar niet verbonden</strong>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        Verbind eerst je Google Calendar om synchronisatie te activeren
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Sync stats */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{syncedAppointments.length}</div>
                          <div className="text-sm text-green-700">Gesynchroniseerd</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">{pendingSyncAppointments.length}</div>
                          <div className="text-sm text-yellow-700">Wachten op sync</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{appointments.filter(apt => apt.created_by_ai).length}</div>
                          <div className="text-sm text-blue-700">Door AI aangemaakt</div>
                        </div>
                      </div>

                      {/* Recent appointments with sync status */}
                      <div className="space-y-2">
                        <h4 className="font-medium">Recente Afspraken</h4>
                        {appointments.slice(0, 5).map((appointment) => (
                          <div key={appointment.id} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <div className="font-medium">{appointment.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(appointment.startTime), 'dd MMM yyyy HH:mm')}
                              </div>
                            </div>
                            <CalendarSyncStatus
                              appointmentId={appointment.id}
                              googleEventId={appointment.googleEventId}
                              syncStatus={appointment.sync_status || 'pending'}
                              onSyncComplete={loadAppointments}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* AI Assistant Modal */}
        {showAIAssistant && (
          <CalendarAIAssistant
            onClose={() => setShowAIAssistant(false)}
            onAppointmentCreated={(appointment) => {
              setShowAIAssistant(false);
              loadAppointments();
              toast({
                title: "Afspraak aangemaakt",
                description: `Afspraak "${appointment.title}" is succesvol aangemaakt door Robin`,
              });
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
