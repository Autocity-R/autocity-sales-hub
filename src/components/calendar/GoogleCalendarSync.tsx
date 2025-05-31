
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

      // For now, we'll simulate the settings until SQL migration is applied
      console.log('Calendar settings will be loaded once SQL migration is applied');
      setIsConnected(false);
      onSyncStatusChange?.(false);
    } catch (error) {
      console.error('Error loading calendar settings:', error);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "Google Calendar Koppeling",
        description: "SQL migratie moet eerst worden uitgevoerd. Ga naar Instellingen > Agenda om te configureren.",
      });
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Verbindingsfout",
        description: "Google Calendar koppeling is nog niet beschikbaar",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    toast({
      title: "Info",
      description: "Google Calendar koppeling wordt beschikbaar na SQL migratie",
    });
  };

  const handleToggleSync = async (enabled: boolean) => {
    setSyncEnabled(enabled);
    toast({
      title: "Info",
      description: "Synchronisatie instellingen worden beschikbaar na SQL migratie",
    });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    toast({
      title: "Info",
      description: "Handmatige synchronisatie wordt beschikbaar na SQL migratie",
    });
    setIsSyncing(false);
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
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Google Calendar configuratie vereist SQL migratie</span>
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
            Configureer Google Calendar
          </Button>
          <p className="text-sm text-muted-foreground">
            Voer eerst de SQL migratie uit om Google Calendar koppeling te activeren
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
