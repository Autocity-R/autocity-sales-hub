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
        setIsConnected(settings.auth_type === 'workload_identity' && !!settings.service_account_email);
        onSetupComplete?.(settings.auth_type === 'workload_identity' && !!settings.service_account_email);
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error);
    }
  };

  const handleSetupWorkloadIdentity = async () => {
    if (!isAdmin) {
      toast({
        title: "Toegang geweigerd",
        description: "Alleen beheerders kunnen de Workload Identity configureren",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Setting up Workload Identity Federation...');
      
      const { data, error } = await supabase.functions.invoke('google-service-auth', {
        body: { action: 'setup_workload_identity' }
      });

      console.log('Workload Identity setup response:', { data, error });

      if (error) {
        console.error('Workload Identity setup error:', error);
        throw error;
      }

      if (data?.success) {
        setIsConnected(true);
        setAuthType('workload_identity');
        setCompanyCalendarSettings({
          ...companyCalendarSettings,
          auth_type: 'workload_identity',
          calendar_name: data.calendar.name,
          calendar_email: data.calendar.email
        });
        onSetupComplete?.(true);

        toast({
          title: "Workload Identity Geconfigureerd",
          description: "Google Calendar is nu verbonden via Workload Identity Federation",
        });
      } else {
        throw new Error(data?.error || 'Workload Identity setup failed');
      }
    } catch (error) {
      console.error('Workload Identity setup error:', error);
      
      if (error.message?.includes('configuration not found')) {
        toast({
          title: "Configuratie Ontbreekt",
          description: "GOOGLE_WORKLOAD_IDENTITY_PROVIDER en GOOGLE_SERVICE_ACCOUNT_EMAIL moeten worden geconfigureerd in Supabase secrets",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Configuratiefout",
          description: `Kon Workload Identity niet configureren: ${error.message}`,
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
        description: "Google Calendar Workload Identity is losgekoppeld",
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
          <Lock className="h-5 w-5" />
          Google Calendar Workload Identity
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
                <strong>Workload Identity Voordelen:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Geen Service Account keys nodig</li>
                  <li>Voldoet aan Google security best practices</li>
                  <li>Automatische token management</li>
                  <li>Werkt met Organization Policies</li>
                  <li>Veiligere authenticatie via OIDC</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 p-4 rounded-md text-sm">
              <p className="text-blue-800 mb-2">
                <strong>Vereiste setup in Google Cloud:</strong>
              </p>
              <ol className="text-blue-700 list-decimal list-inside space-y-1">
                <li>Identity Pool aanmaken in IAM & Admin</li>
                <li>Identity Provider configureren voor Supabase</li>
                <li>Service Account aanmaken (zonder keys!)</li>
                <li>Calendar API access configureren</li>
                <li>Workload Identity binding instellen</li>
              </ol>
            </div>

            <div className="bg-yellow-50 p-4 rounded-md text-sm">
              <p className="text-yellow-800 mb-2">
                <strong>Supabase Secrets Configuratie:</strong>
              </p>
              <ul className="text-yellow-700 list-disc list-inside space-y-1">
                <li><code>GOOGLE_WORKLOAD_IDENTITY_PROVIDER</code>: projects/PROJECT_ID/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID</li>
                <li><code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code>: service-account@project.iam.gserviceaccount.com</li>
              </ul>
            </div>

            <Button 
              onClick={handleSetupWorkloadIdentity} 
              disabled={isLoading || !isAdmin}
              className="gap-2 w-full"
            >
              {isLoading ? (
                <Settings className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              Workload Identity Configureren
            </Button>

            {!isAdmin && (
              <p className="text-sm text-muted-foreground">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                Alleen beheerders kunnen Workload Identity configureren
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Workload Identity Actief
                </h4>
                <p className="text-sm text-muted-foreground">
                  Calendar: {companyCalendarSettings?.calendar_name || 'Auto City Team'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Email: {companyCalendarSettings?.calendar_email || 'info@auto-city.nl'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Service Account: {companyCalendarSettings?.service_account_email || 'Geconfigureerd'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Auth Type: {authType === 'workload_identity' ? 'Workload Identity Federation' : 'OAuth'}
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
                Veilige Team Toegang:
              </h5>
              <p className="text-sm text-green-700 mb-2">
                Workload Identity Federation biedt enterprise-grade beveiliging:
              </p>
              <ul className="text-sm text-green-700 list-disc list-inside space-y-1">
                <li>Geen lange-termijn credentials opgeslagen</li>
                <li>Automatische token rotatie</li>
                <li>Audit logs voor alle API calls</li>
                <li>Voldoet aan security compliance</li>
                <li>Werkt met Google Organization Policies</li>
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
                Workload Identity wordt beheerd door beheerders
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
