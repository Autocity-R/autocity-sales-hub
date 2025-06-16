import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, TestTube2, CheckCircle, AlertCircle, Plus, Trash2, Save, ArrowLeft, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface Agent {
  id: string;
  name: string;
  webhook_url?: string;
  is_webhook_enabled: boolean;
  webhook_config?: any;
}

interface Webhook {
  id: string;
  agent_id: string;
  webhook_name: string;
  webhook_url: string;
  workflow_type: string;
  is_active: boolean;
  retry_count: number;
  timeout_seconds: number;
  headers: any;
}

const fetchAgents = async (): Promise<Agent[]> => {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('id, name, webhook_url, is_webhook_enabled, webhook_config')
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
};

const fetchWebhooks = async (agentId: string): Promise<Webhook[]> => {
  if (!agentId) return [];
  
  const { data, error } = await supabase
    .from('ai_agent_webhooks')
    .select('*')
    .eq('agent_id', agentId);

  if (error) throw error;
  return data || [];
};

export const WebhookConfiguration = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [workflowType, setWorkflowType] = useState("calendar_operations");
  const [retryCount, setRetryCount] = useState(3);
  const [timeoutSeconds, setTimeoutSeconds] = useState(30);
  const [customHeaders, setCustomHeaders] = useState("{}");
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  const { data: agents = [] } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: fetchAgents,
  });

  const { data: webhooks = [] } = useQuery({
    queryKey: ['agent-webhooks', selectedAgent],
    queryFn: () => fetchWebhooks(selectedAgent),
    enabled: !!selectedAgent,
  });

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);

  React.useEffect(() => {
    if (selectedAgentData) {
      setWebhookUrl(selectedAgentData.webhook_url || "");
      const config = selectedAgentData.webhook_config || {};
      setRetryCount(config.retries || 3);
      setTimeoutSeconds(config.timeout || 30);
      setCustomHeaders(JSON.stringify(config.headers || {}, null, 2));
    }
  }, [selectedAgentData]);

  const saveWebhookMutation = useMutation({
    mutationFn: async (data: {
      agentId: string;
      webhookUrl: string;
      config: any;
    }) => {
      // Update agent with webhook URL and enable webhook
      const { error: agentError } = await supabase
        .from('ai_agents')
        .update({
          webhook_url: data.webhookUrl,
          is_webhook_enabled: true,
          webhook_config: data.config
        })
        .eq('id', data.agentId);

      if (agentError) throw agentError;

      // Create or update webhook record
      const { error: webhookError } = await supabase
        .from('ai_agent_webhooks')
        .upsert({
          agent_id: data.agentId,
          webhook_name: `${selectedAgentData?.name || 'Agent'} Webhook`,
          webhook_url: data.webhookUrl,
          workflow_type: workflowType,
          is_active: true,
          retry_count: retryCount,
          timeout_seconds: timeoutSeconds,
          headers: JSON.parse(customHeaders || '{}')
        });

      if (webhookError) throw webhookError;

      return true;
    },
    onSuccess: () => {
      toast({
        title: "Webhook Opgeslagen",
        description: "Webhook configuratie is succesvol opgeslagen en geactiveerd.",
      });
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent-webhooks'] });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: `Kon webhook niet opslaan: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (url: string) => {
      const { data, error } = await supabase.functions.invoke('test-webhook', {
        body: {
          webhookUrl: url,
          testData: {
            agentId: selectedAgent,
            agentName: selectedAgentData?.name,
            message: "Test bericht vanuit CRM systeem",
            systemData: {
              currentTime: new Date().toISOString(),
              testMode: true
            }
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Webhook Test Succesvol",
          description: `Webhook getest met status ${data.status}. Response ontvangen.`,
        });
      } else {
        toast({
          title: "Webhook Test Gefaald",
          description: `Status: ${data.status} - ${data.error || 'Onbekende fout'}`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Test Fout",
        description: `Webhook test gefaald: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSaveWebhook = () => {
    if (!selectedAgent || !webhookUrl) {
      toast({
        title: "Fout",
        description: "Selecteer een agent en voer een webhook URL in.",
        variant: "destructive",
      });
      return;
    }

    try {
      JSON.parse(customHeaders || '{}');
    } catch {
      toast({
        title: "Fout",
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

    saveWebhookMutation.mutate({
      agentId: selectedAgent,
      webhookUrl,
      config
    });
  };

  const handleTestWebhook = () => {
    if (!webhookUrl) {
      toast({
        title: "Fout",
        description: "Voer eerst een webhook URL in.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingWebhook(true);
    testWebhookMutation.mutate(webhookUrl);
    setTimeout(() => setIsTestingWebhook(false), 3000);
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
      {/* Navigation */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Terug naar Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            n8n Webhook Configuratie
          </CardTitle>
          <CardDescription>
            Configureer n8n webhooks voor AI agents om automatische workflows te triggeren
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Agent Selection */}
          <div>
            <Label htmlFor="agent-select">Selecteer AI Agent</Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger>
                <SelectValue placeholder="Kies een AI agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      {agent.name}
                      {agent.is_webhook_enabled && (
                        <Badge variant="default" className="ml-2">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Actief
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAgent && (
            <div className="space-y-6">
              <Separator />

              {/* Current Status */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Huidige Status</h4>
                <div className="flex items-center gap-2">
                  <Badge variant={selectedAgentData?.is_webhook_enabled ? "default" : "secondary"}>
                    {selectedAgentData?.is_webhook_enabled ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    )}
                    {selectedAgentData?.is_webhook_enabled ? "Webhook Actief" : "Webhook Inactief"}
                  </Badge>
                  {selectedAgentData?.webhook_url && (
                    <span className="text-sm text-muted-foreground">
                      URL: {selectedAgentData.webhook_url.substring(0, 50)}...
                    </span>
                  )}
                </div>
              </div>

              {/* Webhook Configuration */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="webhook-url">n8n Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://jouw-n8n-instance.com/webhook/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="workflow-type">Workflow Type</Label>
                    <Select value={workflowType} onValueChange={setWorkflowType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="calendar_operations">Calendar Operations</SelectItem>
                        <SelectItem value="lead_management">Lead Management</SelectItem>
                        <SelectItem value="customer_service">Customer Service</SelectItem>
                        <SelectItem value="general_crm">General CRM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="retry-count">Retry Count</Label>
                    <Input
                      id="retry-count"
                      type="number"
                      min="1"
                      max="10"
                      value={retryCount}
                      onChange={(e) => setRetryCount(parseInt(e.target.value) || 3)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="timeout">Timeout (seconden)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      min="5"
                      max="120"
                      value={timeoutSeconds}
                      onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 30)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="custom-headers">Custom Headers (JSON)</Label>
                  <Textarea
                    id="custom-headers"
                    placeholder='{"Authorization": "Bearer token", "X-Custom": "value"}'
                    value={customHeaders}
                    onChange={(e) => setCustomHeaders(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveWebhook}
                  disabled={saveWebhookMutation.isPending || !webhookUrl}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saveWebhookMutation.isPending ? 'Opslaan...' : 'Webhook Opslaan'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleTestWebhook}
                  disabled={testWebhookMutation.isPending || isTestingWebhook || !webhookUrl}
                  className="flex items-center gap-2"
                >
                  <TestTube2 className="h-4 w-4" />
                  {isTestingWebhook ? 'Testen...' : 'Test Webhook'}
                </Button>
              </div>

              {/* Existing Webhooks */}
              {webhooks.length > 0 && (
                <div>
                  <Separator />
                  <h4 className="font-medium mb-4">Bestaande Webhooks</h4>
                  <div className="space-y-3">
                    {webhooks.map((webhook) => (
                      <Card key={webhook.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{webhook.webhook_name}</span>
                                <Badge variant={webhook.is_active ? "default" : "secondary"}>
                                  {webhook.is_active ? "Actief" : "Inactief"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {webhook.workflow_type} • {webhook.retry_count} retries • {webhook.timeout_seconds}s timeout
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {webhook.webhook_url}
                              </p>
                            </div>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>n8n Integratie Documentatie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Webhook Payload Structuur</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "sessionId": "uuid",
  "message": "gebruiker bericht",
  "agentId": "uuid",
  "agentName": "Calendar Assistant",
  "workflowType": "calendar_operations",
  "userContext": {},
  "systemData": {
    "appointments": [...],
    "contacts": [...],
    "vehicles": [...],
    "availableVehicles": [...]
  }
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">Verwachte Response</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "success": true,
  "message": "Afspraak succesvol ingepland",
  "data": {
    "action": "appointment_created",
    "details": "Afspraak op 2024-01-15 om 14:00"
  }
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
