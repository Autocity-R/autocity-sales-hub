import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Trash2, Eye, EyeOff, Zap, CheckCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAIAgents } from "@/hooks/useAIAgents";
import { Link } from "react-router-dom";

interface NewAgent {
  name: string;
  description: string;
  provider: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  permissions: string[];
}

export const AIAgentManagement = () => {
  const { toast } = useToast();
  const {
    agents,
    isLoading,
    refetch,
    createAgent,
    updateAgent,
    deleteAgent,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAIAgents();

  const [newAgent, setNewAgent] = useState<NewAgent>({
    name: "",
    description: "",
    provider: "",
    model: "",
    apiKey: "",
    systemPrompt: "",
    permissions: []
  });

  const [showApiKeys, setShowApiKeys] = useState<{[key: string]: boolean}>({});

  // Force refresh on component mount and tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Tab became visible, refreshing AI agents...');
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    refetch(); // Initial refresh

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  const availablePermissions = [
    { id: "inventory", label: "Voorraad Beheer" },
    { id: "customers", label: "Klanten Beheer" },
    { id: "leads", label: "Leads Beheer" },
    { id: "reports", label: "Rapportages" },
    { id: "calendar", label: "Agenda" },
    { id: "settings", label: "Instellingen" }
  ];

  const providers = [
    { id: "openai", label: "OpenAI", models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"] },
    { id: "anthropic", label: "Anthropic", models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"] },
    { id: "google", label: "Google", models: ["gemini-pro", "gemini-pro-vision"] },
    { id: "custom", label: "Custom API", models: ["custom-model"] }
  ];

  const toggleApiKeyVisibility = (agentId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [agentId]: !prev[agentId]
    }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + "*".repeat(key.length - 8) + key.substring(key.length - 4);
  };

  const handleCreateAgent = () => {
    if (!newAgent.name || !newAgent.provider || !newAgent.apiKey) {
      toast({
        title: "Fout",
        description: "Vul alle verplichte velden in.",
        variant: "destructive"
      });
      return;
    }

    createAgent({
      name: newAgent.name,
      description: newAgent.description,
      provider: newAgent.provider as any,
      model: newAgent.model,
      apiKey: newAgent.apiKey,
      systemPrompt: newAgent.systemPrompt,
      isActive: true,
      permissions: newAgent.permissions,
      createdAt: new Date()
    });

    setNewAgent({
      name: "",
      description: "",
      provider: "",
      model: "",
      apiKey: "",
      systemPrompt: "",
      permissions: []
    });
  };

  const toggleAgentStatus = (agentId: string, currentStatus: boolean) => {
    updateAgent({
      id: agentId,
      updates: { isActive: !currentStatus }
    });
  };

  const handleDeleteAgent = (agentId: string) => {
    deleteAgent(agentId);
  };

  const togglePermission = (permission: string) => {
    setNewAgent(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: "🔄 Data Bijgewerkt",
      description: "AI agents zijn opnieuw geladen van de database.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>AI agents laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh and navigation */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">AI Agents Beheer</h2>
          <p className="text-muted-foreground">
            Beheer alle AI agents en hun webhook configuraties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Vernieuwen
          </Button>
          <Link to="/ai-agents?tab=webhooks">
            <Button variant="outline" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Webhook Configuratie
            </Button>
          </Link>
        </div>
      </div>

      {/* Existing Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Bestaande AI Agents ({agents.length})
          </CardTitle>
          <CardDescription>
            Overzicht van alle AI agents met hun webhook status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nog geen AI agents aangemaakt</p>
            </div>
          ) : (
            agents.map((agent) => (
              <div key={agent.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{agent.name}</h3>
                      <Badge variant={agent.isActive ? "default" : "secondary"}>
                        {agent.isActive ? "Actief" : "Inactief"}
                      </Badge>
                      <Badge variant="outline">{agent.provider}</Badge>
                      {agent.is_webhook_enabled && agent.webhook_url && (
                        <Badge variant="default" className="bg-green-600">
                          <Zap className="h-3 w-3 mr-1" />
                          Webhook Actief
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                      <span>Model: {agent.model}</span>
                      <span>Aangemaakt: {agent.createdAt.toLocaleDateString()}</span>
                    </div>
                    
                    {/* Webhook Status */}
                    {agent.webhook_url && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="h-4 w-4" />
                          <span className="text-sm font-medium">Webhook Status:</span>
                          <Badge variant={agent.is_webhook_enabled ? "default" : "secondary"}>
                            {agent.is_webhook_enabled ? "Ingeschakeld" : "Uitgeschakeld"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 font-mono">
                          {agent.webhook_url}
                        </p>
                      </div>
                    )}

                    <div className="mt-2">
                      <span className="text-sm font-medium">Toegang: </span> 
                      {agent.permissions.map(permission => (
                        <Badge key={permission} variant="outline" className="mr-1">
                          {availablePermissions.find(p => p.id === permission)?.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={agent.isActive}
                      onCheckedChange={() => toggleAgentStatus(agent.id, agent.isActive)}
                      disabled={isUpdating}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAgent(agent.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create New Agent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nieuwe AI Agent Aanmaken
          </CardTitle>
          <CardDescription>
            Configureer een nieuwe AI agent met database integratie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Naam *</Label>
              <Input
                id="agentName"
                placeholder="bijv. Calendar Assistant"
                value={newAgent.name}
                onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">AI Provider *</Label>
              <Select 
                value={newAgent.provider} 
                onValueChange={(value) => setNewAgent(prev => ({ ...prev, provider: value, model: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Select
                value={newAgent.model}
                onValueChange={(value) => setNewAgent(prev => ({ ...prev, model: value }))}
                disabled={!newAgent.provider}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer model" />
                </SelectTrigger>
                <SelectContent>
                  {newAgent.provider && providers.find(p => p.id === newAgent.provider)?.models.map(model => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Sleutel *</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Voer API sleutel in"
                value={newAgent.apiKey}
                onChange={(e) => setNewAgent(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Input
              id="description"
              placeholder="Beschrijf wat deze agent doet"
              value={newAgent.description}
              onChange={(e) => setNewAgent(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemPrompt">Systeem Prompt</Label>
            <Textarea
              id="systemPrompt"
              placeholder="Geef de AI agent instructies over hoe te handelen..."
              value={newAgent.systemPrompt}
              onChange={(e) => setNewAgent(prev => ({ ...prev, systemPrompt: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>CRM Toegangsrechten</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availablePermissions.map(permission => (
                <label key={permission.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAgent.permissions.includes(permission.id)}
                    onChange={() => togglePermission(permission.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{permission.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleCreateAgent} 
            className="w-full"
            disabled={isCreating || !newAgent.name || !newAgent.provider || !newAgent.apiKey}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isCreating ? "Aanmaken..." : "AI Agent Aanmaken"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
