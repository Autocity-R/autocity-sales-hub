import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Zap, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWebhookOperations } from "@/hooks/useWebhookOperations";
import { AgentSelector } from "./webhook/AgentSelector";
import { WebhookStatusDisplay } from "./webhook/WebhookStatusDisplay";
import { WebhookForm } from "./webhook/WebhookForm";
import { WebhookList } from "./webhook/WebhookList";
import { WebhookDocumentation } from "./webhook/WebhookDocumentation";

export const WebhookConfiguration = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const {
    agents,
    refetchAgents,
    saveWebhookMutation,
    testWebhookMutation,
    getWebhooks,
    forceRefreshAgents,
  } = useWebhookOperations();

  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [workflowType, setWorkflowType] = useState("calendar_operations");
  const [retryCount, setRetryCount] = useState(3);
  const [timeoutSeconds, setTimeoutSeconds] = useState(30);
  const [customHeaders, setCustomHeaders] = useState("{}");
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [isWebhookEnabled, setIsWebhookEnabled] = useState(false);

  const { data: webhooks = [] } = getWebhooks(selectedAgent);
  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);

  // Effect to refresh agents when component mounts or tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Tab became visible, refreshing agents...');
        forceRefreshAgents();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh when component mounts
    forceRefreshAgents();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [forceRefreshAgents]);

  React.useEffect(() => {
    if (selectedAgentData) {
      setWebhookUrl(selectedAgentData.webhook_url || "");
      setIsWebhookEnabled(selectedAgentData.is_webhook_enabled || false);
      const config = selectedAgentData.webhook_config || {};
      setRetryCount(config.retries || 3);
      setTimeoutSeconds(config.timeout || 30);
      setCustomHeaders(JSON.stringify(config.headers || {}, null, 2));
    }
  }, [selectedAgentData]);

  const handleSaveWebhook = async () => {
    if (!selectedAgent) {
      toast({
        title: "⚠️ Selectie Vereist",
        description: "Selecteer eerst een agent.",
        variant: "destructive",
      });
      return;
    }

    if (!webhookUrl) {
      toast({
        title: "⚠️ URL Vereist",
        description: "Voer een webhook URL in.",
        variant: "destructive",
      });
      return;
    }

    try {
      JSON.parse(customHeaders || '{}');
    } catch {
      toast({
        title: "⚠️ JSON Fout",
        description: "Ongeldige JSON in custom headers.",
        variant: "destructive",
      });
      return;
    }

    const config = {
      retries: retryCount,
      timeout: timeoutSeconds,
      headers: JSON.parse(customHeaders || '{}'),
      rate_limit: 60
    };

    // Preserve existing webhook status when modifying URL
    // Only change status if:
    // 1. There's no URL (should disable)
    // 2. This is a new webhook and URL is provided (should enable)
    // 3. User explicitly toggled the status
    const currentlyEnabled = selectedAgentData?.is_webhook_enabled || false;
    const hasExistingWebhook = !!selectedAgentData?.webhook_url;
    
    let enableWebhook: boolean;
    
    if (!webhookUrl.trim()) {
      // No URL provided - always disable
      enableWebhook = false;
      console.log('🔧 No URL provided, disabling webhook');
    } else if (hasExistingWebhook) {
      // Existing webhook with URL - preserve current status
      enableWebhook = currentlyEnabled;
      console.log('🔧 Existing webhook found, preserving status:', currentlyEnabled);
    } else {
      // New webhook with URL - enable by default
      enableWebhook = true;
      console.log('🔧 New webhook with URL, enabling by default');
    }

    console.log('💾 Saving webhook with preserved status:', {
      agentId: selectedAgent,
      webhookUrl: webhookUrl.trim(),
      currentlyEnabled,
      hasExistingWebhook,
      finalEnabledStatus: enableWebhook
    });

    setIsWebhookEnabled(enableWebhook);

    await saveWebhookMutation.mutateAsync({
      agentId: selectedAgent,
      webhookUrl: webhookUrl.trim(),
      enabled: enableWebhook,
      config,
      webhookName: `${selectedAgentData?.name || 'Agent'} Webhook`,
      workflowType,
      retryCount,
      timeoutSeconds,
      headers: JSON.parse(customHeaders || '{}'),
    });
  };

  const handleTestWebhook = () => {
    if (!webhookUrl) {
      toast({
        title: "⚠️ URL Vereist",
        description: "Voer eerst een webhook URL in.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingWebhook(true);
    testWebhookMutation.mutate(webhookUrl);
    setTimeout(() => setIsTestingWebhook(false), 3000);
  };

  const handleToggleWebhook = async (enabled: boolean) => {
    if (!selectedAgent) return;
    
    console.log('🔄 Explicitly toggling webhook status:', {
      agentId: selectedAgent,
      newStatus: enabled,
      hasUrl: !!webhookUrl
    });
    
    setIsWebhookEnabled(enabled);
    
    const config = {
      retries: retryCount,
      timeout: timeoutSeconds,
      headers: JSON.parse(customHeaders || '{}'),
      rate_limit: 60
    };

    await saveWebhookMutation.mutateAsync({
      agentId: selectedAgent,
      webhookUrl,
      enabled,
      config,
      webhookName: `${selectedAgentData?.name || 'Agent'} Webhook`,
      workflowType,
      retryCount,
      timeoutSeconds,
      headers: JSON.parse(customHeaders || '{}'),
    });
  };

  const handleRefresh = () => {
    forceRefreshAgents();
    toast({
      title: "🔄 Data Bijgewerkt",
      description: "Agent configuraties zijn opnieuw geladen.",
    });
  };

  if (!isAdmin) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Toegang geweigerd</h3>
        <p className="text-gray-600">Je hebt geen rechten om webhook configuraties te beheren.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            n8n Webhook Configuratie
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            Configureer n8n webhooks voor AI agents - configuratie blijft permanent opgeslagen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AgentSelector
            agents={agents}
            selectedAgent={selectedAgent}
            onAgentChange={setSelectedAgent}
          />

          {selectedAgent && (
            <div className="space-y-6">
              <Separator />

              <WebhookStatusDisplay selectedAgentData={selectedAgentData} />

              <WebhookForm
                webhookUrl={webhookUrl}
                setWebhookUrl={setWebhookUrl}
                workflowType={workflowType}
                setWorkflowType={setWorkflowType}
                retryCount={retryCount}
                setRetryCount={setRetryCount}
                timeoutSeconds={timeoutSeconds}
                setTimeoutSeconds={setTimeoutSeconds}
                customHeaders={customHeaders}
                setCustomHeaders={setCustomHeaders}
                isWebhookEnabled={isWebhookEnabled}
                onToggleWebhook={handleToggleWebhook}
                onSaveWebhook={handleSaveWebhook}
                onTestWebhook={handleTestWebhook}
                isSaving={saveWebhookMutation.isPending}
                isTesting={testWebhookMutation.isPending || isTestingWebhook}
              />

              <WebhookList webhooks={webhooks} />
            </div>
          )}
        </CardContent>
      </Card>

      <WebhookDocumentation />
    </div>
  );
};
