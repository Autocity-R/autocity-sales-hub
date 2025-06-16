
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Bot, User, Settings, Zap, AlertCircle, CheckCircle, Database, Activity, RefreshCw } from "lucide-react";
import { useAIChat } from "@/hooks/useAIChat";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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

const fetchAIAgents = async (): Promise<AIAgent[]> => {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
};

export const ProductionAIAgentChat = () => {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [message, setMessage] = useState("");

  const { data: agents = [], isLoading: agentsLoading, refetch: refetchAgents } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: fetchAIAgents,
    refetchInterval: 10000, // Refresh every 10 seconds to sync status
  });

  const {
    session,
    messages,
    isLoading: chatLoading,
    isInitializing,
    sendMessage,
    endSession,
    reinitialize,
  } = useAIChat(selectedAgent);

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedAgent || chatLoading) return;
    
    await sendMessage(message);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAgentChange = (agentId: string) => {
    if (session) {
      endSession();
    }
    setSelectedAgent(agentId);
  };

  const handleRefreshAgents = () => {
    refetchAgents();
    toast({
      title: "Agents Bijgewerkt",
      description: "Agent status is opnieuw geladen",
    });
  };

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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Agent Selection & Configuration */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agents
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefreshAgents}
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
          <Select value={selectedAgent} onValueChange={handleAgentChange} disabled={agentsLoading}>
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
                    onClick={endSession}
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

      {/* Chat Interface */}
      <Card className="lg:col-span-3 flex flex-col h-[600px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Enhanced AI Agent Chat
            {selectedAgentData && (
              <Badge variant="outline" className="ml-auto">
                {selectedAgentData.name}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Deze chat triggert n8n workflows met volledig systeem data context
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 border rounded-lg bg-gray-50">
            {!selectedAgent ? (
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Selecteer een AI agent om te beginnen</p>
              </div>
            ) : isInitializing ? (
              <div className="text-center text-gray-500 py-8">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Sessie wordt geïnitialiseerd...</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.messageType === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.messageType === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.messageType === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-white border"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                      <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                      <div className="flex items-center gap-2">
                        {msg.webhookTriggered && (
                          <Badge variant="outline" className="ml-2">
                            <Zap className="h-3 w-3 mr-1" />
                            n8n + Data
                            {msg.processingTime && ` (${msg.processingTime}ms)`}
                          </Badge>
                        )}
                        {selectedAgentData?.data_access_permissions && 
                         Object.values(selectedAgentData.data_access_permissions).some(Boolean) && (
                          <Badge variant="outline" className="bg-green-50">
                            <Database className="h-3 w-3 mr-1" />
                            System Data
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {msg.messageType === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}
            
            {chatLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                selectedAgent 
                  ? selectedAgentData?.is_webhook_enabled
                    ? "Typ je bericht (triggert n8n workflow met systeem data)..."
                    : "Agent heeft geen webhook geconfigureerd"
                  : "Selecteer eerst een AI agent"
              }
              disabled={!selectedAgent || chatLoading || isInitializing || !selectedAgentData?.is_webhook_enabled}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!selectedAgent || !message.trim() || chatLoading || isInitializing || !selectedAgentData?.is_webhook_enabled}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Messages */}
          {selectedAgentData && !selectedAgentData.is_webhook_enabled && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Deze agent heeft geen webhook geconfigureerd. Configureer eerst een n8n webhook.
            </div>
          )}

          {selectedAgentData && selectedAgentData.data_access_permissions && 
           getDataAccessSummary(selectedAgentData.data_access_permissions).length > 0 && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
              <Database className="h-4 w-4 inline mr-1" />
              Agent heeft toegang tot: {getDataAccessSummary(selectedAgentData.data_access_permissions).join(', ')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
