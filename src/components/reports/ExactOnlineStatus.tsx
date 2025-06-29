
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  Building2,
  Calendar,
  Database,
  Loader2
} from "lucide-react";
import { enhancedReportsService } from "@/services/enhancedReportsService";
import { useToast } from "@/hooks/use-toast";

export const ExactOnlineStatus: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean;
    companyName?: string;
    divisionCode?: string;
    lastTested?: string;
    error?: string;
  }>({ isConnected: false });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const status = await enhancedReportsService.getConnectionStatus();
      setConnectionStatus(status);
    } catch (error) {
      console.error('Failed to check connection status:', error);
      setConnectionStatus({ 
        isConnected: false, 
        error: 'Failed to check connection' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const { authUrl } = await enhancedReportsService.initiateAuthentication();
      
      // Open OAuth flow in popup window
      const popup = window.open(
        authUrl, 
        'exact-online-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for popup completion
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Check connection status after popup closes
          setTimeout(() => {
            checkConnectionStatus();
            setIsConnecting(false);
          }, 1000);
        }
      }, 1000);

      toast({
        title: "Authenticatie Gestart",
        description: "Voltooi de Exact Online authenticatie in het popup venster",
      });

    } catch (error) {
      console.error('Failed to initiate connection:', error);
      setIsConnecting(false);
      toast({
        title: "Verbinding Mislukt",
        description: "Kon geen verbinding maken met Exact Online",
        variant: "destructive"
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await enhancedReportsService.disconnect();
      setConnectionStatus({ isConnected: false });
      toast({
        title: "Verbinding Verbroken",
        description: "Exact Online verbinding is succesvol verbroken",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon verbinding niet verbreken",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Checking Exact Online connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${connectionStatus.isConnected ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          <Database className="h-6 w-6" />
          Exact Online Integration Status
          {connectionStatus.isConnected ? (
            <Badge className="bg-green-500 text-white">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge className="bg-orange-500 text-white">
              <XCircle className="w-3 h-3 mr-1" />
              Not Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionStatus.isConnected ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-green-600" />
                <span className="font-medium">Company:</span>
                <span>{connectionStatus.companyName || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-green-600" />
                <span className="font-medium">Division:</span>
                <span>{connectionStatus.divisionCode || 'Unknown'}</span>
              </div>
              {connectionStatus.lastTested && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Last Tested:</span>
                  <span>{new Date(connectionStatus.lastTested).toLocaleString('nl-NL')}</span>
                </div>
              )}
            </div>
            
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Live Financial Data Active!</strong><br />
                Your reports are now powered by real-time data from Exact Online. 
                All financial metrics and analytics are automatically synchronized.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkConnectionStatus}
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Test Connection
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert className="border-orange-200 bg-orange-50">
              <XCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Using Mock Data</strong><br />
                Connect to Exact Online to transform your reports with real-time financial intelligence.
                {connectionStatus.error && (
                  <><br /><span className="text-red-600">Error: {connectionStatus.error}</span></>
                )}
              </AlertDescription>
            </Alert>

            <div className="bg-white p-4 rounded-lg border border-orange-200">
              <h4 className="font-semibold mb-2">Benefits of Exact Online Integration:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Real-time revenue and cost data</li>
                <li>• Accurate profit margins and financial KPIs</li>
                <li>• Automated invoice and payment tracking</li>
                <li>• Period-over-period growth analysis</li>
                <li>• Enhanced financial forecasting</li>
              </ul>
            </div>

            <Button 
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect to Exact Online
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
