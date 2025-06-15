import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar,
  Bot,
  Shield,
  RefreshCw,
  Zap,
  CheckCircle,
  Info,
  Users,
  Key
} from "lucide-react";
import { GoogleServiceAccountSetup } from "@/components/calendar/GoogleServiceAccountSetup";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [companyCalendarInfo, setCompanyCalendarInfo] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsAdmin(profile?.role === 'admin' || profile?.role === 'owner');
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const loadSettings = async () => {
    try {
      // Load company calendar settings
      const { data: companySettings } = await supabase
        .from('company_calendar_settings')
        .select('*')
        .eq('company_id', 'auto-city')
        .single();

      if (companySettings) {
        setCompanyCalendarInfo(companySettings);
        setCalendarConnected(companySettings.auth_type === 'service_account');
        setSyncSettings(prev => ({
          ...prev,
          autoSync: companySettings.auto_sync || true,
          syncDirection: companySettings.sync_direction || 'bidirectional',
          conflictResolution: companySettings.conflict_resolution || 'crm_priority'
        }));
      }

      // Load AI agent calendar settings
      const { data: aiAgentSettings } = await supabase
        .from('ai_agent_calendar_settings')
        .select('*')
        .eq('agent_id', 'calendar-assistant')
        .single();

      if (aiAgentSettings) {
        setAiSettings(prev => ({
          ...prev,
          canCreateAppointments: aiAgentSettings.can_create_appointments,
          canModifyAppointments: aiAgentSettings.can_modify_appointments,
          canDeleteAppointments: aiAgentSettings.can_delete_appointments,
          defaultDuration: aiAgentSettings.default_appointment_duration,
          conflictResolution: aiAgentSettings.conflict_resolution,
          workingHours: {
            start: aiAgentSettings.working_hours_start,
            end: aiAgentSettings.working_hours_end,
            workDays: aiAgentSettings.working_days
          }
        }));
      }

      console.log('Settings loaded successfully');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveAiSettings = async () => {
    if (!isAdmin) {
      toast({
        title: "Toegang geweigerd",
        description: "Alleen beheerders kunnen AI instellingen wijzigen",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('ai_agent_calendar_settings')
        .update({
          can_create_appointments: aiSettings.canCreateAppointments,
          can_modify_appointments: aiSettings.canModifyAppointments,
          can_delete_appointments: aiSettings.canDeleteAppointments,
          default_appointment_duration: aiSettings.defaultDuration,
          conflict_resolution: aiSettings.conflictResolution,
          working_hours_start: aiSettings.workingHours.start,
          working_hours_end: aiSettings.workingHours.end,
          working_days: aiSettings.workingHours.workDays
        })
        .eq('agent_id', 'calendar-assistant');

      if (error) throw error;

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
    if (!isAdmin) {
      toast({
        title: "Toegang geweigerd",
        description: "Alleen beheerders kunnen sync instellingen wijzigen",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('company_calendar_settings')
        .upsert({
          company_id: 'auto-city',
          auto_sync: syncSettings.autoSync,
          sync_direction: syncSettings.syncDirection,
          conflict_resolution: syncSettings.conflictResolution,
          managed_by_user_id: user.id
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
      {/* Info Card voor Service Account approach */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Key className="h-5 w-5" />
            Google Service Account Implementatie
          </CardTitle>
          <CardDescription className="text-green-700">
            We gebruiken nu een Google Service Account voor betrouwbare Calendar integratie. 
            Dit biedt directe API toegang zonder OAuth complexiteit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Directe API toegang zonder OAuth flow</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Betrouwbare server-to-server authenticatie</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Stabiele, permanente verbinding</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Google Service Account Setup */}
      <GoogleServiceAccountSetup onSetupComplete={setCalendarConnected} />

      {/* AI Assistant Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agenda Assistent (Robin)
            {calendarConnected && aiSettings.enabled && (
              <Badge variant="outline" className="text-green-700 border-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Actief
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Configureer de AI assistent voor automatisch agenda beheer via Service Account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>AI Assistent Inschakelen</Label>
                <p className="text-sm text-muted-foreground">
                  Laat de AI assistent afspraken beheren met Service Account toegang
                </p>
              </div>
              <Switch
                checked={aiSettings.enabled}
                onCheckedChange={(checked) => 
                  setAiSettings(prev => ({ ...prev, enabled: checked }))
                }
                disabled={!isAdmin}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={aiSettings.canCreateAppointments}
                  onCheckedChange={(checked) =>
                    setAiSettings(prev => ({ ...prev, canCreateAppointments: checked }))
                  }
                  disabled={!isAdmin}
                />
                <Label>Afspraken Aanmaken</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={aiSettings.canModifyAppointments}
                  onCheckedChange={(checked) =>
                    setAiSettings(prev => ({ ...prev, canModifyAppointments: checked }))
                  }
                  disabled={!isAdmin}
                />
                <Label>Afspraken Wijzigen</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={aiSettings.canDeleteAppointments}
                  onCheckedChange={(checked) =>
                    setAiSettings(prev => ({ ...prev, canDeleteAppointments: checked }))
                  }
                  disabled={!isAdmin}
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
                  disabled={!isAdmin}
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
                  disabled={!isAdmin}
                >
                  <option value="reject">Weigeren bij conflict</option>
                  <option value="suggest">Alternatief voorstellen</option>
                  <option value="override">Overschrijven (voorzichtig)</option>
                </select>
              </div>
            </div>

            {!isAdmin && (
              <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                <Info className="h-4 w-4 inline mr-2" />
                Alleen beheerders kunnen AI instellingen wijzigen
              </div>
            )}
          </div>

          <Button 
            onClick={saveAiSettings} 
            disabled={isLoading || !isAdmin} 
            className="gap-2"
          >
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
            Configureer hoe afspraken worden gesynchroniseerd via Service Account
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
                disabled={!calendarConnected || !isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label>Synchronisatie Richting</Label>
              <select
                value={syncSettings.syncDirection}
                onChange={(e) =>
                  setSyncSettings(prev => ({ ...prev, syncDirection: e.target.value }))
                }
                disabled={!calendarConnected || !isAdmin}
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
                disabled={!calendarConnected || !isAdmin}
                className="w-full p-2 border rounded-md"
              >
                <option value="crm_priority">CRM heeft prioriteit</option>
                <option value="google_priority">Google Calendar heeft prioriteit</option>
                <option value="manual">Handmatige keuze</option>
              </select>
            </div>

            {!isAdmin && (
              <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                <Info className="h-4 w-4 inline mr-2" />
                Alleen beheerders kunnen sync instellingen wijzigen
              </div>
            )}
          </div>

          <Button 
            onClick={saveSyncSettings} 
            disabled={isLoading || !calendarConnected || !isAdmin} 
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
