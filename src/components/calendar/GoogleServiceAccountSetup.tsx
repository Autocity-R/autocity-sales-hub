
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Settings,
  Building2,
  Key,
  Users,
  Lock
} from "lucide-react";

interface GoogleServiceAccountSetupProps {
  onSetupComplete?: (connected: boolean) => void;
}

export const GoogleServiceAccountSetup: React.FC<GoogleServiceAccountSetupProps> = ({
  onSetupComplete
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [companyCalendarSettings, setCompanyCalendarSettings] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authType, setAuthType] = useState<string>('oauth');
  const { toast } = useToast();

  useEffect(() => {
    loadCalendarSettings();
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
        setAuthType(settings.auth_type || 'oauth');
        setIsConnected(settings.auth_type === 'service_account' && !!settings.service_account_email);
        onSetupComplete?.(settings.auth_type === 'service_account' && !!settings.service_account_email);
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error);
    }
  };

  const handleSetupServiceAccount = async () => {
    if (!isAdmin) {
      toast({
        title: "Toegang geweigerd",
        description: "Alleen beheerders kunnen de Service Account configureren",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Setting up Google Service Account...');
      
      const { data, error } = await supabase.functions.invoke('google-service-auth', {
        body: { action: 'setup_service_account' }
      });

      console.log('Service Account setup response:', { data, error });

      if (error) {
        console.error('Service Account setup error:', error);
        throw error;
      }

      if (data?.success) {
        setIsConnected(true);
        setAuthType('service_account');
        setCompanyCalendarSettings({
          ...companyCalendarSettings,
          auth_type: 'service_account',
          calendar_name: data.calendar.name,
          calendar_email: data.calendar.email
        });
        onSetupComplete?.(true);

        toast({
          title: "Service Account Geconfigureerd",
          description: "Google Calendar is nu verbonden via Service Account authenticatie",
        });
      } else {
        throw new Error(data?.error || 'Service Account setup failed');
      }
    } catch (error) {
      console.error('Service Account setup error:', error);
      
      if (error.message?.includes('not found')) {
        toast({
          title: "Service Account Key Ontbreekt",
          description: "GOOGLE_SERVICE_ACCOUNT_KEY moet worden geconfigureerd in Supabase secrets",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Configuratiefout",
          description: `Kon Service Account niet configureren: ${error.message}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!isAdmin) {
      toast({
        title: "Toegang geweigerd",
        description: "Alleen beheerders kunnen de verbinding ontkoppelen",
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
      onSetupComplete?.(false);

      toast({
        title: "Verbinding Verbroken",
        description: "Google Calendar Service Account is losgekoppeld",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Google Calendar Service Account
          {isConnected && (
            <Badge variant="outline" className="text-green-700 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              Actief
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Service Account Voordelen:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Directe API toegang zonder OAuth flow</li>
                  <li>Betrouwbare authenticatie met private key</li>
                  <li>Geen token refresh problemen</li>
                  <li>Geschikt voor server-to-server communicatie</li>
                  <li>Eenvoudige setup en onderhoud</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 p-4 rounded-md text-sm">
              <p className="text-blue-800 mb-2">
                <strong>Vereiste setup in Google Cloud:</strong>
              </p>
              <ol className="text-blue-700 list-decimal list-inside space-y-1">
                <li>Ga naar Google Cloud Console</li>
                <li>Selecteer je project</li>
                <li>Ga naar IAM & Admin → Service Accounts</li>
                <li>Maak een nieuwe Service Account aan</li>
                <li>Download de JSON key file</li>
                <li>Enable de Calendar API voor je project</li>
                <li>Optioneel: Enable Domain-wide Delegation</li>
              </ol>
            </div>

            <div className="bg-green-50 p-4 rounded-md text-sm">
              <p className="text-green-800 mb-2">
                <strong>Service Account Key Upload:</strong>
              </p>
              <p className="text-green-700 mb-2">
                Upload de volledige JSON inhoud van je Service Account key naar Supabase secrets als <code>GOOGLE_SERVICE_ACCOUNT_KEY</code>.
              </p>
              <p className="text-green-700">
                De key bevat alle benodigde credentials voor directe Google Calendar API toegang.
              </p>
            </div>

            <Button 
              onClick={handleSetupServiceAccount} 
              disabled={isLoading || !isAdmin}
              className="gap-2 w-full"
            >
              {isLoading ? (
                <Settings className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              Service Account Configureren
            </Button>

            {!isAdmin && (
              <p className="text-sm text-muted-foreground">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                Alleen beheerders kunnen Service Account configureren
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Service Account Actief
                </h4>
                <p className="text-sm text-muted-foreground">
                  Calendar: {companyCalendarSettings?.calendar_name || 'Google Calendar'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Service Account: {companyCalendarSettings?.service_account_email || 'Geconfigureerd'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Auth Type: {authType === 'service_account' ? 'Service Account' : 'OAuth'}
                </p>
              </div>
              {isAdmin && (
                <Button onClick={handleDisconnect} variant="outline" size="sm">
                  Ontkoppelen
                </Button>
              )}
            </div>

            <div className="bg-green-50 p-4 rounded-md">
              <h5 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Betrouwbare Team Toegang:
              </h5>
              <p className="text-sm text-green-700 mb-2">
                Service Account authenticatie biedt stabiele toegang:
              </p>
              <ul className="text-sm text-green-700 list-disc list-inside space-y-1">
                <li>Directe API communicatie</li>
                <li>Geen OAuth token problemen</li>
                <li>Automatische authenticatie</li>
                <li>Stabiele lange-termijn toegang</li>
                <li>Geschikt voor server applicaties</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => window.open('https://calendar.google.com', '_blank')}
                variant="outline"
                className="gap-2 flex-1"
              >
                <ExternalLink className="h-4 w-4" />
                Open Google Calendar
              </Button>
            </div>

            {!isAdmin && (
              <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                <Shield className="h-4 w-4 inline mr-2" />
                Service Account wordt beheerd door beheerders
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
