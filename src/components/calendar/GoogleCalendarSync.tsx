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
  Clock,
  Building2,
  Shield
} from "lucide-react";

interface GoogleCalendarSyncProps {
  onSyncStatusChange?: (synced: boolean) => void;
}

export const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({
  onSyncStatusChange
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [companyCalendarSettings, setCompanyCalendarSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCalendarSettings();
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'owner'])
        .maybeSingle();

      setIsAdmin(!!userRole);
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const loadCalendarSettings = async () => {
    try {
      const { data: settings, error } = await supabase
        .from('company_calendar_settings')
        .select('*')
        .eq('company_id', 'auto-city')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading company calendar settings:', error);
        return;
      }

      if (settings) {
        setCompanyCalendarSettings(settings);
        setIsConnected(!!settings.google_access_token);
        setSyncEnabled(settings.sync_enabled || false);
        onSyncStatusChange?.(!!settings.google_access_token);
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error);
    }
  };

  const handleConnect = async () => {
    if (!isAdmin) {
      toast({
        title: "Toegang geweigerd",
        description: "Alleen beheerders kunnen de calendar verbinden",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Starting Google Calendar connection...');
      
      // Get the authorization URL from our edge function with proper URL parameters
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        method: 'GET',
        // Send as query parameters, not in body
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.authUrl) {
        console.log('Redirecting to Google OAuth:', data.authUrl);
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Verbindingsfout",
        description: `Kon niet verbinden met Google Calendar: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!isAdmin) {
      toast({
        title: "Toegang geweigerd",
        description: "Alleen beheerders kunnen de calendar ontkoppelen",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('company_calendar_settings')
        .delete()
        .eq('company_id', 'auto-city');

      if (error) throw error;

      setIsConnected(false);
      setCompanyCalendarSettings(null);
      setSyncEnabled(false);
      onSyncStatusChange?.(false);

      toast({
        title: "Verbinding verbroken",
        description: "Google Calendar is losgekoppeld van de centrale calendar",
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
    if (!isAdmin) {
      toast({
        title: "Toegang geweigerd",
        description: "Alleen beheerders kunnen sync instellingen wijzigen",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('company_calendar_settings')
        .update({ 
          sync_enabled: enabled,
          managed_by_user_id: user.id
        })
        .eq('company_id', 'auto-city');

      if (error) throw error;

      setSyncEnabled(enabled);
      toast({
        title: enabled ? "Synchronisatie ingeschakeld" : "Synchronisatie uitgeschakeld",
        description: enabled 
          ? "Afspraken worden nu automatisch gesynchroniseerd met de centrale Google Calendar"
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
              appointmentId: appointment.id,
              company_mode: true
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
        description: `${syncedCount} afspraken gesynchroniseerd met de centrale Google Calendar`,
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

  const handleImportFromGoogle = async () => {
    setIsSyncing(true);
    try {
      const { data: importResult, error } = await supabase.functions.invoke('google-calendar-import');

      if (error) throw error;

      if (importResult?.success) {
        toast({
          title: "Import voltooid",
          description: `${importResult.imported} van ${importResult.total} nieuwe afspraken geïmporteerd uit Google Calendar`,
        });
        
        // Refresh the calendar view if needed
        window.location.reload();
      } else {
        throw new Error(importResult?.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Importfout",
        description: "Kon afspraken niet importeren uit Google Calendar",
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
          <Building2 className="h-5 w-5" />
          Centrale Google Calendar Integratie
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
              <span>Centrale Google Calendar nog niet verbonden</span>
            </div>
            <div className="bg-blue-50 p-4 rounded-md text-sm">
              <p className="text-blue-800 mb-2">
                <strong>Let op:</strong> Dit koppelt de centrale calendar voor het hele team (info@auto-city.nl)
              </p>
              <p className="text-blue-700">
                Zorg ervoor dat je ingelogd bent met het info@auto-city.nl account voordat je verbindt.
              </p>
            </div>
            <Button 
              onClick={handleConnect} 
              disabled={isLoading || !isAdmin}
              className="gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Verbind Centrale Google Calendar
            </Button>
            {!isAdmin && (
              <p className="text-sm text-muted-foreground">
                <Shield className="h-3 w-3 inline mr-1" />
                Alleen beheerders kunnen de calendar verbinden
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Synchroniseer automatisch alle team afspraken met de centrale Google Calendar
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Centrale Calendar: {companyCalendarSettings?.calendar_name || 'Auto City Team'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Email: {companyCalendarSettings?.calendar_email || 'info@auto-city.nl'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Laatste synchronisatie: {companyCalendarSettings?.updated_at ? 
                    new Date(companyCalendarSettings.updated_at).toLocaleString('nl-NL') : 
                    'Nog nooit'
                  }
                </p>
              </div>
              {isAdmin && (
                <Button onClick={handleDisconnect} variant="outline" size="sm">
                  Verbreek verbinding
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Automatische synchronisatie</h4>
                <p className="text-sm text-muted-foreground">
                  Sync alle team afspraken automatisch bij wijzigingen
                </p>
              </div>
              <Switch
                checked={syncEnabled}
                onCheckedChange={handleToggleSync}
                disabled={!isAdmin}
              />
            </div>

            <div className="bg-green-50 p-4 rounded-md">
              <h5 className="font-medium text-green-800 mb-2">Automatische Import Status:</h5>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">
                    Google Calendar wordt automatisch elke 30 minuten geïmporteerd
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Import gebeurt bij pagina laden en op de achtergrond
                  </p>
                </div>
                <Badge variant="outline" className="text-green-700 border-green-300">
                  <Clock className="h-3 w-3 mr-1" />
                  Actief
                </Badge>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-md">
              <h5 className="font-medium text-blue-800 mb-2">Team Calendar Toegang:</h5>
              <p className="text-sm text-blue-700 mb-2">
                Voor volledige team toegang, deel de calendar met alle teamleden:
              </p>
              <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                <li>Open Google Calendar met verkoop@auto-city.nl account</li>
                <li>Ga naar calendar instellingen</li>
                <li>Voeg teamleden toe met "Wijzigen en beheren van gebeurtenissen" rechten</li>
                <li>Team kan nu alle afspraken zien en bewerken</li>
              </ol>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Button 
                  onClick={handleManualSync}
                  disabled={isSyncing || !isAdmin}
                  variant="outline"
                  className="gap-2 flex-1"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  CRM → Google
                </Button>
                <Button 
                  onClick={handleImportFromGoogle}
                  disabled={isSyncing || !isAdmin}
                  variant="outline"
                  className="gap-2 flex-1"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                  Google → CRM
                </Button>
              </div>
              <Button 
                onClick={() => window.open('https://calendar.google.com', '_blank')}
                variant="outline"
                className="gap-2 w-full"
              >
                <ExternalLink className="h-4 w-4" />
                Open Google Calendar
              </Button>
            </div>

            {!isAdmin && (
              <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                <Shield className="h-4 w-4 inline mr-2" />
                Alleen beheerders kunnen sync instellingen wijzigen
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
