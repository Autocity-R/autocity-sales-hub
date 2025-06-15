
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TestTube, Calendar, CheckCircle, AlertCircle, ExternalLink, Info, Users, Copy } from "lucide-react";

export const GoogleCalendarTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const { toast } = useToast();

  const handleTestSync = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log('🧪 Starting Google Calendar test...');
      
      const { data, error } = await supabase.functions.invoke('test-google-calendar', {
        body: {}
      });

      if (error) {
        throw error;
      }

      setTestResult(data);
      
      if (data.success) {
        toast({
          title: "Test Succesvol! 🎉",
          description: `Test event aangemaakt in Service Account calendar voor vandaag om ${data.eventTime?.split(' - ')[0]}`,
        });
      } else {
        toast({
          title: "Test Mislukt",
          description: data.error || "Onbekende fout tijdens test",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Test error:', error);
      setTestResult({ 
        success: false, 
        error: error.message || 'Test mislukt' 
      });
      toast({
        title: "Test Fout",
        description: "Kon Google Calendar test niet uitvoeren",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyCalendarEmail = async (email: string) => {
    await navigator.clipboard.writeText(email);
    toast({
      title: "Gekopieerd!",
      description: "Service Account email is gekopieerd naar clipboard",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Google Calendar Sync Test (Service Account)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Test of de Google Calendar integratie werkt door een test event aan te maken in de Service Account calendar voor vandaag om 14:00.
        </p>
        
        <Button 
          onClick={handleTestSync}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Test wordt uitgevoerd...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4" />
              Start Service Account Calendar Test
            </>
          )}
        </Button>

        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <h4 className={`font-medium ${
                testResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {testResult.success ? 'Test Succesvol!' : 'Test Mislukt'}
              </h4>
            </div>
            
            {testResult.success ? (
              <div className="space-y-3 text-sm">
                <p className="text-green-700">{testResult.message}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <p><strong>Event ID:</strong> {testResult.eventId}</p>
                  <p><strong>Tijd:</strong> {testResult.eventTime}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p><strong>Service Account:</strong> {testResult.credentials?.clientEmail}</p>
                  <Button
                    onClick={() => copyCalendarEmail(testResult.credentials?.clientEmail)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                
                {testResult.sharingInstructions && (
                  <div className="bg-blue-50 p-3 rounded-md mt-3">
                    <h5 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Hoe teamleden deze calendar kunnen toevoegen:
                    </h5>
                    <ol className="text-xs text-blue-700 list-decimal list-inside space-y-1">
                      {testResult.sharingInstructions.steps.map((step: string, index: number) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
                
                {testResult.eventLink && (
                  <a 
                    href={testResult.eventLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in Google Calendar
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-red-700">{testResult.error}</p>
                <p className="text-red-600">{testResult.details}</p>
                
                {testResult.debugInfo && (
                  <div className="mt-3 p-3 bg-gray-100 rounded">
                    <p className="text-xs"><strong>Debug Info:</strong></p>
                    <p className="text-xs">Service Account: {testResult.debugInfo.serviceAccount}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Service Account Calendar:</strong> Deze test maakt events aan in de Service Account's eigen calendar. 
              Teamleden kunnen deze calendar toevoegen aan hun Google Calendar om alle CRM afspraken te zien.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
