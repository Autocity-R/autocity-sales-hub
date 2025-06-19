
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Zap,
  MessageSquare,
  Settings
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const RobinCalendarDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  // Fetch recent appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', selectedPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('starttime', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch calendar sync status
  const { data: syncStatus } = useQuery({
    queryKey: ['calendar-sync-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_calendar_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(apt => 
      apt.starttime?.startsWith(today)
    );

    return {
      total: todayAppointments.length,
      confirmed: todayAppointments.filter(apt => apt.status === 'bevestigd').length,
      pending: todayAppointments.filter(apt => apt.status === 'gepland').length,
      aiCreated: todayAppointments.filter(apt => apt.created_by_ai).length
    };
  };

  const stats = getTodayStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-green-600" />
            Robin - Calendar AI Dashboard
          </h2>
          <p className="text-muted-foreground">
            Agenda management en afspraak intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={syncStatus?.sync_enabled ? "default" : "secondary"}>
            {syncStatus?.sync_enabled ? "Google Sync Actief" : "Sync Uitgeschakeld"}
          </Badge>
          {syncStatus?.sync_enabled && (
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3" />
              Auto-Sync
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Afspraken Vandaag</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.aiCreated} door Robin aangemaakt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bevestigd</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0}% bevestigingsratio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wachtend</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Vereisen actie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.aiCreated / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Geautomatiseerd</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appointments">Recente Afspraken</TabsTrigger>
          <TabsTrigger value="sync-status">Sync Status</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recente Afspraken</CardTitle>
              <CardDescription>
                Overzicht van alle afspraken en Robin's betrokkenheid
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appointmentsLoading ? (
                <div className="text-center py-4">
                  <Clock className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p>Afspraken laden...</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Geen afspraken gevonden</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.slice(0, 8).map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{appointment.title}</h4>
                          {appointment.created_by_ai && (
                            <Badge variant="outline" className="text-xs">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Robin
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {appointment.customername} - {new Date(appointment.starttime).toLocaleString('nl-NL')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          appointment.status === 'bevestigd' ? 'default' : 
                          appointment.status === 'geannuleerd' ? 'destructive' : 'secondary'
                        }>
                          {appointment.status}
                        </Badge>
                        {appointment.google_event_id && (
                          <Badge variant="outline" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Synced
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync-status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google Calendar Synchronisatie</CardTitle>
              <CardDescription>
                Status van de kalendersynchronisatie en instellingen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {syncStatus ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Synchronisatie Status</h4>
                      <div className="flex items-center gap-2">
                        {syncStatus.sync_enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                        <span className={syncStatus.sync_enabled ? "text-green-600" : "text-yellow-600"}>
                          {syncStatus.sync_enabled ? "Actief" : "Inactief"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Auto-Sync</h4>
                      <div className="flex items-center gap-2">
                        {syncStatus.auto_sync ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                        <span>
                          {syncStatus.auto_sync ? "Ingeschakeld" : "Uitgeschakeld"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {syncStatus.calendar_email && (
                    <div>
                      <h4 className="font-medium mb-2">Gekoppelde Kalender</h4>
                      <p className="text-sm text-muted-foreground font-mono">
                        {syncStatus.calendar_email}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Kalender nog niet geconfigureerd</p>
                  <Button className="mt-2" variant="outline">
                    Configureer Google Calendar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Robin AI Insights</CardTitle>
              <CardDescription>
                Intelligente inzichten over afspraakpatronen en optimalisaties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Afspraak Trends
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Robin heeft {stats.aiCreated} van de {stats.total} afspraken vandaag automatisch ingepland.
                    Dit toont een hoge mate van automatisering in het afspraakproces.
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Optimalisatie Suggesties
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Bevestigingsratio kan worden verbeterd door automatische herinneringen</li>
                    <li>• Google Calendar sync zorgt voor betere beschikbaarheid</li>
                    <li>• AI kan helpen bij het detecteren van dubbele boekingen</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
