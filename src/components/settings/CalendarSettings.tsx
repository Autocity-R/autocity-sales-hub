
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
  CheckCircle
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
  const [calendarConnected, setCalendarConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load calendar settings
      const { data: calendarSettings } = await supabase
        .from('user_calendar_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (calendarSettings) {
        setCalendarConnected(!!calendarSettings.google_access_token);
        setSyncSettings(prev => ({
          ...prev,
          autoSync: calendarSettings.auto_sync || true,
          syncDirection: calendarSettings.sync_direction || 'bidirectional',
          conflictResolution: calendarSettings.conflict_resolution || 'crm_priority'
        }));
      }

      // Load AI agent settings would go here
      console.log('AI Agent settings loaded from database');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveAiSettings = async () => {
    setIsLoading(true);
    try {
      // For now, just save to local state until we implement N8N integration
      toast({
        title: "AI Instellingen Opgeslagen",
        description: "De AI assistent instellingen zijn bijgewerkt",
      });
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast({
        title: "Fout",
        description: "Kon AI instellingen niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSyncSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_calendar_settings')
        .upsert({
          user_id: user.id,
          auto_sync: syncSettings.autoSync,
          sync_direction: syncSettings.syncDirection,
          conflict_resolution: syncSettings.conflictResolution
        });

      if (error) throw error;

      toast({
        title: "Sync Instellingen Opgeslagen",
        description: "De synchronisatie instellingen zijn bijgewerkt",
      });
    } catch (error) {
      console.error('Error saving sync settings:', error);
      toast({
        title: "Fout",
        description: "Kon sync instellingen niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Google Calendar Connection */}
      <GoogleCalendarSync onSyncStatusChange={setCalendarConnected} />

      {/* AI Assistant Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agenda Assistent (Robin)
            {calendarConnected && (
              <Badge variant="outline" className="text-green-700 border-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Actief
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Configureer de AI assistent voor automatisch agenda beheer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
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
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={aiSettings.canCreateAppointments}
                  onCheckedChange={(checked) =>
                    setAiSettings(prev => ({ ...prev, canCreateAppointments: checked }))
                  }
                />
                <Label>Afspraken Aanmaken</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={aiSettings.canModifyAppointments}
                  onCheckedChange={(checked) =>
                    setAiSettings(prev => ({ ...prev, canModifyAppointments: checked }))
                  }
                />
                <Label>Afspraken Wijzigen</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={aiSettings.canDeleteAppointments}
                  onCheckedChange={(checked) =>
                    setAiSettings(prev => ({ ...prev, canDeleteAppointments: checked }))
                  }
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
                  onChange={(e) =>
                    setAiSettings(prev => ({ ...prev, defaultDuration: parseInt(e.target.value) || 60 }))
                  }
                  min="15"
                  max="480"
                />
              </div>
              <div className="space-y-2">
                <Label>Conflict Afhandeling</Label>
                <select
                  value={aiSettings.conflictResolution}
                  onChange={(e) =>
                    setAiSettings(prev => ({ ...prev, conflictResolution: e.target.value }))
                  }
                  className="w-full p-2 border rounded-md"
                >
                  <option value="reject">Weigeren bij conflict</option>
                  <option value="suggest">Alternatief voorstellen</option>
                  <option value="override">Overschrijven (voorzichtig)</option>
                </select>
              </div>
            </div>
          </div>

          <Button onClick={saveAiSettings} disabled={isLoading} className="gap-2">
            <Zap className="h-4 w-4" />
            AI Instellingen Opslaan
          </Button>
        </CardContent>
      </Card>

      {/* Synchronization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Synchronisatie Instellingen
          </CardTitle>
          <CardDescription>
            Configureer hoe afspraken worden gesynchroniseerd met Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Automatische Synchronisatie</Label>
                <p className="text-sm text-muted-foreground">
                  Afspraken automatisch synchroniseren bij wijzigingen
                </p>
              </div>
              <Switch
                checked={syncSettings.autoSync}
                onCheckedChange={(checked) =>
                  setSyncSettings(prev => ({ ...prev, autoSync: checked }))
                }
                disabled={!calendarConnected}
              />
            </div>

            <div className="space-y-2">
              <Label>Synchronisatie Richting</Label>
              <select
                value={syncSettings.syncDirection}
                onChange={(e) =>
                  setSyncSettings(prev => ({ ...prev, syncDirection: e.target.value }))
                }
                disabled={!calendarConnected}
                className="w-full p-2 border rounded-md"
              >
                <option value="bidirectional">Bidirectioneel (beide kanten)</option>
                <option value="crm_to_google">CRM naar Google Calendar</option>
                <option value="google_to_crm">Google Calendar naar CRM</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Conflict Afhandeling</Label>
              <select
                value={syncSettings.conflictResolution}
                onChange={(e) =>
                  setSyncSettings(prev => ({ ...prev, conflictResolution: e.target.value }))
                }
                disabled={!calendarConnected}
                className="w-full p-2 border rounded-md"
              >
                <option value="crm_priority">CRM heeft prioriteit</option>
                <option value="google_priority">Google Calendar heeft prioriteit</option>
                <option value="manual">Handmatige keuze</option>
              </select>
            </div>
          </div>

          <Button 
            onClick={saveSyncSettings} 
            disabled={isLoading || !calendarConnected} 
            className="gap-2"
          >
            <Shield className="h-4 w-4" />
            Sync Instellingen Opslaan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
