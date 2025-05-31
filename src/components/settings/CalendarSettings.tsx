
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GoogleCalendarSync } from "@/components/calendar/GoogleCalendarSync";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar,
  Bot,
  Shield,
  RefreshCw,
  Zap,
  AlertCircle
} from "lucide-react";

export const CalendarSettings = () => {
  const [aiSettings, setAiSettings] = useState({
    enabled: true,
    canCreateAppointments: true,
    canModifyAppointments: false,
    canDeleteAppointments: false,
    conflictResolution: 'reject',
    defaultDuration: 60,
    workingHours: {
      start: '09:00',
      end: '17:00',
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    }
  });
  
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncDirection: 'bidirectional',
    conflictResolution: 'crm_priority',
    reminderSettings: {
      enabled: true,
      beforeMinutes: 15
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('AI Agent settings will be loaded once SQL migration is applied');
      console.log('Calendar settings will be loaded once SQL migration is applied');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveAiSettings = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "Info",
        description: "AI instellingen worden beschikbaar na SQL migratie",
      });
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast({
        title: "Fout",
        description: "AI instellingen kunnen nog niet worden opgeslagen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSyncSettings = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "Info",
        description: "Sync instellingen worden beschikbaar na SQL migratie",
      });
    } catch (error) {
      console.error('Error saving sync settings:', error);
      toast({
        title: "Fout",
        description: "Sync instellingen kunnen nog niet worden opgeslagen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Migration Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            SQL Migratie Vereist
          </CardTitle>
          <CardDescription>
            Google Calendar en AI Agent functies vereisen een database migratie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Voer de SQL migratie uit om de volgende functies te activeren:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground space-y-1">
            <li>Google Calendar synchronisatie</li>
            <li>AI Agent agenda beheer</li>
            <li>Automatische conflict detectie</li>
            <li>Real-time sync status</li>
          </ul>
        </CardContent>
      </Card>

      {/* Google Calendar Connection */}
      <GoogleCalendarSync />

      {/* AI Assistant Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agenda Assistent (Binnenkort Beschikbaar)
          </CardTitle>
          <CardDescription>
            Configureer de AI assistent voor automatisch agenda beheer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 opacity-50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>AI Assistent Inschakelen</Label>
                <p className="text-sm text-muted-foreground">
                  Laat de AI assistent afspraken beheren
                </p>
              </div>
              <Switch
                checked={aiSettings.enabled}
                onCheckedChange={(checked) => 
                  setAiSettings(prev => ({ ...prev, enabled: checked }))
                }
                disabled
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={aiSettings.canCreateAppointments}
                  disabled
                />
                <Label>Afspraken Aanmaken</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={aiSettings.canModifyAppointments}
                  disabled
                />
                <Label>Afspraken Wijzigen</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={aiSettings.canDeleteAppointments}
                  disabled
                />
                <Label>Afspraken Verwijderen</Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Standaard Duur (minuten)</Label>
                <Input
                  type="number"
                  value={aiSettings.defaultDuration}
                  disabled
                  min="15"
                  max="480"
                />
              </div>
              <div className="space-y-2">
                <Label>Conflict Afhandeling</Label>
                <select
                  value={aiSettings.conflictResolution}
                  disabled
                  className="w-full p-2 border rounded-md opacity-50"
                >
                  <option value="reject">Weigeren bij conflict</option>
                  <option value="suggest">Alternatief voorstellen</option>
                  <option value="override">Overschrijven (voorzichtig)</option>
                </select>
              </div>
            </div>
          </div>

          <Button onClick={saveAiSettings} disabled={true} className="gap-2">
            <Zap className="h-4 w-4" />
            AI Instellingen Opslaan (Vereist SQL Migratie)
          </Button>
        </CardContent>
      </Card>

      {/* Synchronization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Synchronisatie Instellingen (Binnenkort Beschikbaar)
          </CardTitle>
          <CardDescription>
            Configureer hoe afspraken worden gesynchroniseerd met Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 opacity-50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Automatische Synchronisatie</Label>
                <p className="text-sm text-muted-foreground">
                  Afspraken automatisch synchroniseren bij wijzigingen
                </p>
              </div>
              <Switch
                checked={syncSettings.autoSync}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label>Synchronisatie Richting</Label>
              <select
                value={syncSettings.syncDirection}
                disabled
                className="w-full p-2 border rounded-md opacity-50"
              >
                <option value="bidirectional">Bidirectioneel (beide kanten)</option>
                <option value="crm_to_google">CRM naar Google Calendar</option>
                <option value="google_to_crm">Google Calendar naar CRM</option>
              </select>
            </div>
          </div>

          <Button onClick={saveSyncSettings} disabled={true} className="gap-2">
            <Shield className="h-4 w-4" />
            Sync Instellingen Opslaan (Vereist SQL Migratie)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
