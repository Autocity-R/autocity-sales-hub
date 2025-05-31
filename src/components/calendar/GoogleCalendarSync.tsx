
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

      const { data: settings, error } = await supabase
        .from('user_calendar_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading calendar settings:', error);
        return;
      }

      if (settings) {
        setCalendarSettings(settings);
        setIsConnected(!!settings.google_access_token);
        setSyncEnabled(settings.sync_enabled || false);
        onSyncStatusChange?.(!!settings.google_access_token);
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Get the authorization URL from our edge function
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'get_auth_url' }
      });

      if (error) throw error;

      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Verbindingsfout",
        description: "Kon niet verbinden met Google Calendar. Probeer het opnieuw.",
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
        title: "Verbinding verbroken",
        description: "Google Calendar is losgekoppeld van je account",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Fout",
        description: "Kon verbinding niet verbreken",
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
        title: enabled ? "Synchronisatie ingeschakeld" : "Synchronisatie uitgeschakeld",
        description: enabled 
          ? "Afspraken worden nu automatisch gesynchroniseerd met Google Calendar"
          : "Automatische synchronisatie is gestopt",
      });
    } catch (error) {
      console.error('Toggle sync error:', error);
      toast({
        title: "Fout",
        description: "Kon synchronisatie-instelling niet wijzigen",
        variant: "destructive",
      });
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      // Get all pending appointments
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('sync_status', 'pending');

      if (error) throw error;

      let syncedCount = 0;
      for (const appointment of appointments || []) {
        try {
          const { data: syncResult } = await supabase.functions.invoke('calendar-sync', {
            body: {
              action: 'sync_to_google',
              appointmentId: appointment.id
            }
          });

          if (syncResult?.success) {
            syncedCount++;
          }
        } catch (syncError) {
          console.error(`Failed to sync appointment ${appointment.id}:`, syncError);
        }
      }

      toast({
        title: "Synchronisatie voltooid",
        description: `${syncedCount} afspraken gesynchroniseerd met Google Calendar`,
      });
    } catch (error) {
      console.error('Manual sync error:', error);
      toast({
        title: "Synchronisatiefout",
        description: "Kon niet alle afspraken synchroniseren",
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
          {isConnected && (
            <Badge variant="outline" className="text-green-700 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verbonden
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Google Calendar nog niet verbonden</span>
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
              Verbind Google Calendar
            </Button>
            <p className="text-sm text-muted-foreground">
              Synchroniseer automatisch je afspraken met Google Calendar
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Google Calendar: {calendarSettings?.calendar_name || 'Primary'}</h4>
                <p className="text-sm text-muted-foreground">
                  Laatste synchronisatie: {calendarSettings?.updated_at ? 
                    new Date(calendarSettings.updated_at).toLocaleString('nl-NL') : 
                    'Nog nooit'
                  }
                </p>
              </div>
              <Button onClick={handleDisconnect} variant="outline" size="sm">
                Verbreek verbinding
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Automatische synchronisatie</h4>
                <p className="text-sm text-muted-foreground">
                  Sync afspraken automatisch bij wijzigingen
                </p>
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
                className="gap-2 flex-1"
              >
                {isSyncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Handmatig synchroniseren
              </Button>
              <Button 
                onClick={() => window.open('https://calendar.google.com', '_blank')}
                variant="outline"
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Google Calendar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
