import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Settings, Trash2, Key, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIAgent {
  id: string;
  name: string;
  description: string;
  provider: "openai" | "anthropic" | "google" | "custom";
  model: string;
  apiKey: string;
  systemPrompt: string;
  isActive: boolean;
  permissions: string[];
  createdAt: Date;
}

export const AIAgentManagement = () => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AIAgent[]>([
    {
      id: "1",
      name: "Verkoop Assistent",
      description: "AI agent gespecialiseerd in verkoop en lead management",
      provider: "openai",
      model: "gpt-4",
      apiKey: "sk-1234567890abcdef",
      systemPrompt: "Je bent een verkoop assistent voor een autohandel CRM systeem...",
      isActive: true,
      permissions: ["leads", "customers", "inventory"],
      createdAt: new Date("2024-01-15")
    }
  ]);

  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    provider: "",
    model: "",
    apiKey: "",
    systemPrompt: "",
    permissions: [] as string[]
  });

  const [showApiKeys, setShowApiKeys] = useState<{[key: string]: boolean}>({});

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

    const agent: AIAgent = {
      id: Date.now().toString(),
      name: newAgent.name,
      description: newAgent.description,
      provider: newAgent.provider as AIAgent["provider"],
      model: newAgent.model,
      apiKey: newAgent.apiKey,
      systemPrompt: newAgent.systemPrompt,
      isActive: true,
      permissions: newAgent.permissions,
      createdAt: new Date()
    };

    setAgents(prev => [...prev, agent]);
    setNewAgent({
      name: "",
      description: "",
      provider: "",
      model: "",
      apiKey: "",
      systemPrompt: "",
      permissions: []
    });

    toast({
      title: "AI Agent Aangemaakt",
      description: `${agent.name} is succesvol aangemaakt en geactiveerd.`,
    });
  };

  const toggleAgentStatus = (agentId: string) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, isActive: !agent.isActive }
        : agent
    ));
  };

  const deleteAgent = (agentId: string) => {
    setAgents(prev => prev.filter(agent => agent.id !== agentId));
    toast({
      title: "AI Agent Verwijderd",
      description: "De AI agent is verwijderd uit het systeem.",
    });
  };

  const togglePermission = (permission: string) => {
    setNewAgent(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Existing Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agents Beheer
          </CardTitle>
          <CardDescription>
            Beheer alle AI agents die toegang hebben tot het CRM systeem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {agents.map((agent) => (
            <div key={agent.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{agent.name}</h3>
                    <Badge variant={agent.isActive ? "default" : "secondary"}>
                      {agent.isActive ? "Actief" : "Inactief"}
                    </Badge>
                    <Badge variant="outline">{agent.provider}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Model: {agent.model}</span>
                    <span>Aangemaakt: {agent.createdAt.toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm font-medium">API Sleutel: </span> 
                    <span className="text-sm font-mono">
                      {showApiKeys[agent.id] ? agent.apiKey : maskApiKey(agent.apiKey)}
                    </span>
                  </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleApiKeyVisibility(agent.id)}
                  >
                    {showApiKeys[agent.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Switch
                    checked={agent.isActive}
                    onCheckedChange={() => toggleAgentStatus(agent.id)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteAgent(agent.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
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
            Configureer een nieuwe AI agent met volledige toegang tot het CRM systeem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Naam</Label>
              <Input
                id="agentName"
                placeholder="bijv. Verkoop Assistent"
                value={newAgent.name}
                onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">AI Provider</Label>
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
              <Label htmlFor="apiKey">API Sleutel</Label>
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

          <Button onClick={handleCreateAgent} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            AI Agent Aanmaken
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
