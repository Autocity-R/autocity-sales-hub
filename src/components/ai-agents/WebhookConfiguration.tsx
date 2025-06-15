import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Zap, Plus, Trash2, TestTube, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { triggerWebhook } from "@/services/webhookService";

interface WebhookConfig {
  id?: string;
  agent_id: string;
  webhook_name: string;
  webhook_url: string;
  workflow_type: string;
  is_active: boolean;
  retry_count: number;
  timeout_seconds: number;
  headers: Record<string, string>;
}

interface Agent {
  id: string;
  name: string;
  is_webhook_enabled: boolean;
}

const fetchAgents = async (): Promise<Agent[]> => {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('id, name, is_webhook_enabled')
    .eq('is_active', true);
  
  if (error) throw error;
  return data || [];
};

const fetchWebhooks = async (agentId: string) => {
  const { data, error } = await supabase
    .from('ai_agent_webhooks')
    .select('*')
    .eq('agent_id', agentId);
  
  if (error) throw error;
  return data || [];
};

export const WebhookConfiguration = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-for-webhooks'],
    queryFn: fetchAgents,
  });

  const { data: webhooks = [], refetch: refetchWebhooks } = useQuery({
    queryKey: ['agent-webhooks', selectedAgent],
    queryFn: () => fetchWebhooks(selectedAgent),
    enabled: !!selectedAgent,
  });

  const saveWebhookMutation = useMutation({
    mutationFn: async (webhook: WebhookConfig) => {
      if (webhook.id) {
        const { error } = await supabase
          .from('ai_agent_webhooks')
          .update(webhook)
          .eq('id', webhook.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_agent_webhooks')
          .insert(webhook);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Succes",
        description: "Webhook configuratie opgeslagen",
      });
      setIsEditing(false);
      setEditingWebhook(null);
      refetchWebhooks();
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: `Kon webhook niet opslaan: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const { error } = await supabase
        .from('ai_agent_webhooks')
        .delete()
        .eq('id', webhookId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Succes",
        description: "Webhook verwijderd",
      });
      refetchWebhooks();
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (webhook: any) => {
      return await triggerWebhook(
        webhook.webhook_url,
        {
          sessionId: 'test_session',
          message: 'Dit is een test bericht van het CRM systeem',
          workflowType: webhook.workflow_type,
          agentId: webhook.agent_id,
          userContext: { test: true },
        },
        {
          timeout: webhook.timeout_seconds * 1000,
          retries: 1,
          headers: webhook.headers,
        }
      );
    },
    onSuccess: (result) => {
      toast({
        title: result.success ? "Test Succesvol" : "Test Gefaald",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    },
  });

  const handleCreateWebhook = () => {
    setEditingWebhook({
      agent_id: selectedAgent,
      webhook_name: '',
      webhook_url: '',
      workflow_type: 'general',
      is_active: true,
      retry_count: 3,
      timeout_seconds: 30,
      headers: {},
    });
    setIsEditing(true);
  };

  const handleEditWebhook = (webhook: any) => {
    setEditingWebhook(webhook);
    setIsEditing(true);
  };

  const handleSaveWebhook = () => {
    if (!editingWebhook) return;
    saveWebhookMutation.mutate(editingWebhook);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Webhook Configuratie
          </CardTitle>
          <CardDescription>
            Configureer n8n webhooks voor je AI agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="agent-select">Selecteer Agent</Label>
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
                          <Badge variant="outline">Webhook Enabled</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAgent && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Webhooks</h3>
                  <Button onClick={handleCreateWebhook} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe Webhook
                  </Button>
                </div>

                <div className="space-y-3">
                  {webhooks.map((webhook) => (
                    <Card key={webhook.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{webhook.webhook_name}</h4>
                              <Badge variant={webhook.is_active ? "default" : "secondary"}>
                                {webhook.is_active ? "Actief" : "Inactief"}
                              </Badge>
                              <Badge variant="outline">{webhook.workflow_type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {webhook.webhook_url}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1">
                              Timeout: {webhook.timeout_seconds}s | Retries: {webhook.retry_count}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testWebhookMutation.mutate(webhook)}
                              disabled={testWebhookMutation.isPending}
                            >
                              <TestTube className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditWebhook(webhook)}
                            >
                              Bewerk
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {webhooks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Geen webhooks geconfigureerd voor deze agent
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Editor Dialog */}
      {isEditing && editingWebhook && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingWebhook.id ? 'Webhook Bewerken' : 'Nieuwe Webhook'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="webhook-name">Webhook Naam</Label>
              <Input
                id="webhook-name"
                value={editingWebhook.webhook_name}
                onChange={(e) => setEditingWebhook({
                  ...editingWebhook,
                  webhook_name: e.target.value,
                })}
                placeholder="Bijvoorbeeld: Calendar Operations"
              />
            </div>

            <div>
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                value={editingWebhook.webhook_url}
                onChange={(e) => setEditingWebhook({
                  ...editingWebhook,
                  webhook_url: e.target.value,
                })}
                placeholder="https://your-n8n-instance.com/webhook/..."
              />
            </div>

            <div>
              <Label htmlFor="workflow-type">Workflow Type</Label>
              <Select
                value={editingWebhook.workflow_type}
                onValueChange={(value) => setEditingWebhook({
                  ...editingWebhook,
                  workflow_type: value,
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calendar">Calendar</SelectItem>
                  <SelectItem value="crm">CRM</SelectItem>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="retry-count">Retry Count</Label>
                <Input
                  id="retry-count"
                  type="number"
                  value={editingWebhook.retry_count}
                  onChange={(e) => setEditingWebhook({
                    ...editingWebhook,
                    retry_count: parseInt(e.target.value) || 3,
                  })}
                />
              </div>
              <div>
                <Label htmlFor="timeout">Timeout (seconden)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={editingWebhook.timeout_seconds}
                  onChange={(e) => setEditingWebhook({
                    ...editingWebhook,
                    timeout_seconds: parseInt(e.target.value) || 30,
                  })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={editingWebhook.is_active}
                onCheckedChange={(checked) => setEditingWebhook({
                  ...editingWebhook,
                  is_active: checked,
                })}
              />
              <Label htmlFor="is-active">Webhook Actief</Label>
            </div>

            <div>
              <Label htmlFor="headers">Headers (JSON)</Label>
              <Textarea
                id="headers"
                value={JSON.stringify(editingWebhook.headers, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    setEditingWebhook({
                      ...editingWebhook,
                      headers,
                    });
                  } catch {
                    // Invalid JSON, keep current state
                  }
                }}
                placeholder='{"Authorization": "Bearer token", "X-Custom-Header": "value"}'
                rows={4}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleSaveWebhook} disabled={saveWebhookMutation.isPending}>
                Opslaan
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Annuleren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
