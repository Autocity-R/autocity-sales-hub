
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Sync,
  Settings,
  Clock
} from "lucide-react";

interface GoogleCalendarSyncProps {
  onSyncStatusChange?: (synced: boolean) => void;
}

export const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({
  onSyncStatusChange
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [calendarSettings, setCalendarSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCalendarSettings();
  }, []);

  const loadCalendarSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_calendar_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setCalendarSettings(data);
        setIsConnected(true);
        setSyncEnabled(data.sync_enabled);
        onSyncStatusChange?.(true);
      } else {
        setIsConnected(false);
        onSyncStatusChange?.(false);
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const { data: authUrl } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'get_auth_url' }
      });

      if (authUrl?.authUrl) {
        window.open(authUrl.authUrl, '_blank');
        
        // Poll for connection status
        const pollInterval = setInterval(async () => {
          await loadCalendarSettings();
          if (isConnected) {
            clearInterval(pollInterval);
            toast({
              title: "Google Calendar Verbonden",
              description: "Je Google Calendar is succesvol gekoppeld!",
            });
          }
        }, 2000);

        // Stop polling after 60 seconds
        setTimeout(() => clearInterval(pollInterval), 60000);
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Verbindingsfout",
        description: "Kon niet verbinden met Google Calendar",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_calendar_settings')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      setCalendarSettings(null);
      setSyncEnabled(false);
      onSyncStatusChange?.(false);

      toast({
        title: "Google Calendar Ontkoppeld",
        description: "Je Google Calendar is ontkoppeld van het systeem",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Fout bij ontkoppelen",
        description: "Kon Google Calendar niet ontkoppelen",
        variant: "destructive",
      });
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_calendar_settings')
        .update({ sync_enabled: enabled })
        .eq('user_id', user.id);

      if (error) throw error;

      setSyncEnabled(enabled);
      toast({
        title: enabled ? "Synchronisatie Ingeschakeld" : "Synchronisatie Uitgeschakeld",
        description: enabled 
          ? "Afspraken worden nu automatisch gesynchroniseerd met Google Calendar"
          : "Automatische synchronisatie is uitgeschakeld",
      });
    } catch (error) {
      console.error('Toggle sync error:', error);
      toast({
        title: "Fout",
        description: "Kon synchronisatie-instellingen niet wijzigen",
        variant: "destructive",
      });
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      // Get all unsynchronized appointments
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .or('sync_status.is.null,sync_status.eq.pending')
        .limit(10);

      if (error) throw error;

      let syncedCount = 0;
      
      for (const appointment of appointments || []) {
        try {
          const { error: syncError } = await supabase.functions.invoke('calendar-sync', {
            body: {
              action: 'sync_to_google',
              appointmentId: appointment.id,
            }
          });

          if (!syncError) {
            syncedCount++;
          }
        } catch (syncError) {
          console.error(`Failed to sync appointment ${appointment.id}:`, syncError);
        }
      }

      toast({
        title: "Synchronisatie Voltooid",
        description: `${syncedCount} afspraken gesynchroniseerd met Google Calendar`,
      });

    } catch (error) {
      console.error('Manual sync error:', error);
      toast({
        title: "Synchronisatiefout",
        description: "Kon niet synchroniseren met Google Calendar",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integratie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Google Calendar niet verbonden</span>
            </div>
            <Button 
              onClick={handleConnect} 
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Verbind met Google Calendar
            </Button>
            <p className="text-sm text-muted-foreground">
              Koppel je Google Calendar om afspraken automatisch te synchroniseren
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Verbonden</span>
              </div>
              <Badge variant="outline" className="text-green-700 border-green-300">
                {calendarSettings?.calendar_name || 'Primaire Kalender'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium">Automatische Synchronisatie</div>
                <div className="text-sm text-muted-foreground">
                  Afspraken automatisch synchroniseren met Google Calendar
                </div>
              </div>
              <Switch
                checked={syncEnabled}
                onCheckedChange={handleToggleSync}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleManualSync}
                disabled={isSyncing}
                variant="outline"
                className="gap-2"
              >
                {isSyncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sync className="h-4 w-4" />
                )}
                Handmatig Synchroniseren
              </Button>
              
              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Ontkoppelen
              </Button>
            </div>

            {calendarSettings?.last_synced_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                Laatste sync: {new Date(calendarSettings.last_synced_at).toLocaleString('nl-NL')}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
