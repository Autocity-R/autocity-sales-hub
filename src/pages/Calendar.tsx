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
import { GoogleServiceAccountSetup } from "@/components/calendar/GoogleServiceAccountSetup";
import { CalendarSyncStatus } from "@/components/calendar/CalendarSyncStatus";
import { GoogleCalendarTest } from "@/components/calendar/GoogleCalendarTest";
import { BranchSyncStatusPanel } from "@/components/calendar/BranchSyncStatusPanel";
import { fetchAppointments } from "@/services/calendarService";
import { Appointment, CalendarView as CalendarViewType } from "@/types/calendar";
import { useAutoCalendarSync } from "@/hooks/useAutoCalendarSync";
import { useCurrentBranch, filterByBranch, BRANCH_LABELS, BRANCH_COLOR_CLASSES, BranchCode } from "@/contexts/BranchContext";
import { BranchChip } from "@/components/layout/BranchSwitcher";
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
  Settings,
  TestTube,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay, endOfDay, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";

const Calendar = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const { branchFilter } = useCurrentBranch();
  const filteredAppointments = React.useMemo(
    () => filterByBranch(appointments, branchFilter),
    [appointments, branchFilter],
  );
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
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const { toast } = useToast();

  // Auto sync hook - triggers import on load and periodically
  const { triggerImport, isEnabled: syncIsEnabled } = useAutoCalendarSync({
    enabled: autoSyncEnabled && googleCalendarConnected,
    onImportComplete: (imported) => {
      if (imported > 0) {
        loadAppointments();
      }
    },
    autoImportInterval: 30 // 30 minutes
  });

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

  const todayAppointments = filteredAppointments.filter(apt => {
    const today = startOfDay(new Date());
    const tomorrow = endOfDay(new Date());
    const aptDate = new Date(apt.startTime);
    return aptDate >= today && aptDate <= tomorrow;
  });

  const thisWeekAppointments = filteredAppointments.filter(apt => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const aptDate = new Date(apt.startTime);
    return aptDate >= weekStart && aptDate <= weekEnd;
  });

  const confirmedAppointments = filteredAppointments.filter(apt => apt.status === "bevestigd");
  const pendingAppointments = filteredAppointments.filter(apt => apt.status === "gepland");
  const syncedAppointments = filteredAppointments.filter(apt => apt.sync_status === "synced");
  const pendingSyncAppointments = filteredAppointments.filter(apt => apt.sync_status === "pending");

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
          description="Beheer alle afspraken met Google Calendar Service Account integratie"
        >
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowGoogleSync(true)} 
              variant="outline" 
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Service Account
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
            <Button onClick={triggerImport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Import Nu
            </Button>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuwe Afspraak
            </Button>
          </div>
        </PageHeader>

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

        {showGoogleSync && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Rotterdam: bestaande service-account flow — geen seconde onderbroken */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${BRANCH_COLOR_CLASSES.rotterdam}`}>
                  {BRANCH_LABELS.rotterdam}
                </span>
                <span className="text-sm text-muted-foreground">Google Calendar Service Account</span>
              </div>
              <GoogleServiceAccountSetup
                onSetupComplete={setGoogleCalendarConnected}
              />
            </div>
            {/* Heerhugowaard: placeholder — echte koppel-flow komt zodra het Google-account bestaat */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${BRANCH_COLOR_CLASSES.heerhugowaard}`}>
                  {BRANCH_LABELS.heerhugowaard}
                </span>
                <span className="text-sm text-muted-foreground">Google Calendar Service Account</span>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>Nog niet geconfigureerd</span>
                    <Badge className="bg-gray-100 text-gray-700 border border-gray-200">
                      <AlertCircle className="mr-1 h-3 w-3" /> Wachten op Google-account
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Voor de vestiging Heerhugowaard komt een aparte Google Workspace-account. Zodra dit account bestaat, wordt hier de service-account koppeling gemaakt (aparte impersonatie, aparte agenda).
                  </p>
                  <p>
                    Tot dan worden Heerhugowaard-afspraken lokaal opgeslagen. Ze belanden <strong>nooit</strong> in de Rotterdam-agenda.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar">Kalender</TabsTrigger>
            <TabsTrigger value="week">Deze Week</TabsTrigger>
            <TabsTrigger value="list">Lijst</TabsTrigger>
            <TabsTrigger value="today">Vandaag</TabsTrigger>
            <TabsTrigger value="sync">Sync Status</TabsTrigger>
            <TabsTrigger value="test">🧪 Test</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <CalendarView
              appointments={filteredAppointments}
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
              appointments={filteredAppointments}
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
                            <BranchChip branch={appointment.branch} />
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
            <BranchSyncStatusPanel
              appointments={appointments}
              onSyncComplete={loadAppointments}
            />
          </TabsContent>

          <TabsContent value="test">
            <GoogleCalendarTest />
          </TabsContent>
        </Tabs>

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
