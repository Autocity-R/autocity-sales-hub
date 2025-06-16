
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bot, Settings, Database, Zap, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { ChatSession } from "@/services/chatSessionService";

interface AIAgent {
  id: string;
  name: string;
  persona: string;
  is_active: boolean;
  is_webhook_enabled?: boolean;
  webhook_url?: string;
  webhook_config?: any;
  data_access_permissions?: any;
  capabilities?: string[];
}

interface AgentSelectionPanelProps {
  agents: AIAgent[];
  selectedAgent: string;
  selectedAgentData?: AIAgent;
  session: ChatSession | null;
  messages: any[];
  agentsLoading: boolean;
  onAgentChange: (agentId: string) => void;
  onRefreshAgents: () => void;
  onEndSession: () => void;
}

export const AgentSelectionPanel: React.FC<AgentSelectionPanelProps> = ({
  agents,
  selectedAgent,
  selectedAgentData,
  session,
  messages,
  agentsLoading,
  onAgentChange,
  onRefreshAgents,
  onEndSession,
}) => {
  const getDataAccessSummary = (permissions: any) => {
    if (!permissions) return [];
    return Object.entries(permissions)
      .filter(([_, hasAccess]) => hasAccess)
      .map(([key, _]) => {
        switch(key) {
          case 'leads': return 'Leads';
          case 'customers': return 'Klanten';
          case 'contacts': return 'Contacten';
          case 'vehicles': return 'Voertuigen';
          case 'appointments': return 'Afspraken';
          case 'contracts': return 'Contracten';
          case 'warranty': return 'Garantie';
          case 'loan_cars': return 'Leen Auto\'s';
          default: return key;
        }
      });
  };

  const getWebhookStatus = (agent: AIAgent) => {
    if (!agent.webhook_url) return { status: 'not_configured', label: 'Niet geconfigureerd', color: 'secondary' };
    if (!agent.is_webhook_enabled) return { status: 'disabled', label: 'Uitgeschakeld', color: 'secondary' };
    return { status: 'active', label: 'Actief', color: 'default' };
  };

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Agents
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefreshAgents}
            className="ml-auto"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          Selecteer een AI agent met systeem data toegang
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedAgent} onValueChange={onAgentChange} disabled={agentsLoading}>
          <SelectTrigger>
            <SelectValue placeholder="Kies een AI agent" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                <div className="flex items-center gap-2">
                  {agent.name}
                  {getWebhookStatus(agent).status === 'active' && (
                    <Zap className="h-3 w-3 text-green-600" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedAgentData && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                {selectedAgentData.name}
                <Badge variant={getWebhookStatus(selectedAgentData).color as any}>
                  {getWebhookStatus(selectedAgentData).status === 'active' ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {getWebhookStatus(selectedAgentData).label}
                </Badge>
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedAgentData.persona}
              </p>
            </div>

            {/* Webhook Status Detail */}
            {selectedAgentData.webhook_url && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <h5 className="font-medium text-purple-800 flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  n8n Webhook
                </h5>
                <div className="text-sm text-purple-700 mt-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span>Status:</span>
                    <Badge variant={selectedAgentData.is_webhook_enabled ? "default" : "secondary"}>
                      {selectedAgentData.is_webhook_enabled ? "Actief" : "Inactief"}
                    </Badge>
                  </div>
                  <div className="text-xs break-all">
                    URL: {selectedAgentData.webhook_url.substring(0, 40)}...
                  </div>
                  {selectedAgentData.webhook_config && (
                    <div className="text-xs">
                      Timeout: {selectedAgentData.webhook_config.timeout || 30}s • 
                      Retries: {selectedAgentData.webhook_config.retries || 3}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Capabilities */}
            {selectedAgentData.capabilities && selectedAgentData.capabilities.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-800 flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  Capabilities
                </h5>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedAgentData.capabilities.map((capability, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {capability}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Data Access */}
            {selectedAgentData.data_access_permissions && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h5 className="font-medium text-green-800 flex items-center gap-1">
                  <Database className="h-4 w-4" />
                  Data Toegang
                </h5>
                <div className="flex flex-wrap gap-1 mt-2">
                  {getDataAccessSummary(selectedAgentData.data_access_permissions).map((dataType, index) => (
                    <Badge key={index} variant="outline" className="text-xs text-green-700">
                      {dataType}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {session && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-800">Actieve Sessie</h5>
                <div className="text-sm text-blue-700 mt-1">
                  <div>ID: {session.sessionToken.substring(0, 8)}...</div>
                  <div>Status: {session.status}</div>
                  <div>Berichten: {messages.length}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEndSession}
                  className="mt-2"
                >
                  Sessie Beëindigen
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Alle Agents:</h4>
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between text-sm p-2 rounded border">
              <span className="truncate font-medium">{agent.name}</span>
              <div className="flex items-center gap-1">
                {getWebhookStatus(agent).status === 'active' ? (
                  <Zap className="h-3 w-3 text-green-600" />
                ) : (
                  <Settings className="h-3 w-3 text-gray-400" />
                )}
                {agent.data_access_permissions && Object.values(agent.data_access_permissions).some(Boolean) && (
                  <Database className="h-3 w-3 text-blue-600" />
                )}
                <Badge 
                  variant={agent.is_active ? "default" : "secondary"}
                  className="text-xs"
                >
                  {agent.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
