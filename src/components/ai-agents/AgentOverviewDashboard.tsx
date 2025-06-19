
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Calendar, 
  TrendingUp, 
  Zap, 
  Activity,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useProductionAIChat } from "@/hooks/useProductionAIChat";
import { initializeHendrikAgent } from "@/services/salesAgentService";

interface AgentStats {
  totalInteractions: number;
  activeToday: number;
  successRate: number;
  webhookStatus: 'active' | 'inactive' | 'error';
}

export const AgentOverviewDashboard = () => {
  const { agents, agentsLoading } = useProductionAIChat();
  const [agentStats, setAgentStats] = useState<Record<string, AgentStats>>({});

  useEffect(() => {
    initializeAgents();
  }, []);

  const initializeAgents = async () => {
    try {
      // Initialize Hendrik if not exists
      await initializeHendrikAgent();
      
      // Mock stats for now - in real implementation these would come from database
      const mockStats: Record<string, AgentStats> = {
        'robin': {
          totalInteractions: 245,
          activeToday: 12,
          successRate: 94,
          webhookStatus: 'active'
        },
        'hendrik': {
          totalInteractions: 89,
          activeToday: 7,
          successRate: 87,
          webhookStatus: 'inactive'
        }
      };
      setAgentStats(mockStats);
    } catch (error) {
      console.error('Failed to initialize agents:', error);
    }
  };

  const getAgentIcon = (agentName: string) => {
    if (agentName.toLowerCase().includes('hendrik') || agentName.toLowerCase().includes('sales')) {
      return <TrendingUp className="h-6 w-6 text-blue-600" />;
    }
    if (agentName.toLowerCase().includes('robin') || agentName.toLowerCase().includes('calendar')) {
      return <Calendar className="h-6 w-6 text-green-600" />;
    }
    return <Brain className="h-6 w-6 text-purple-600" />;
  };

  const getWebhookStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>Agents laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI Agents Overzicht</h2>
        <p className="text-muted-foreground">
          Centraal dashboard voor alle AI agents en hun prestaties
        </p>
      </div>

      {/* Global Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actieve Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.filter(a => a.is_active).length}</div>
            <p className="text-xs text-muted-foreground">van {agents.length} totaal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interacties Vandaag</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(agentStats).reduce((sum, stats) => sum + stats.activeToday, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Alle agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhooks Actief</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter(a => a.is_webhook_enabled).length}
            </div>
            <p className="text-xs text-muted-foreground">N8N gekoppeld</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gem. Succes Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(Object.values(agentStats).reduce((sum, stats) => sum + stats.successRate, 0) / Object.values(agentStats).length) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Alle agents</p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Agent Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {agents.map((agent) => {
          const agentKey = agent.name.toLowerCase().includes('hendrik') ? 'hendrik' : 'robin';
          const stats = agentStats[agentKey] || { totalInteractions: 0, activeToday: 0, successRate: 0, webhookStatus: 'inactive' as const };
          
          return (
            <Card key={agent.id} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getAgentIcon(agent.name)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {agent.persona ? agent.persona.substring(0, 80) + '...' : 'AI Assistant'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={agent.is_active ? "default" : "secondary"}>
                      {agent.is_active ? "Actief" : "Inactief"}
                    </Badge>
                    {agent.is_webhook_enabled && (
                      <div className="flex items-center gap-1">
                        {getWebhookStatusIcon(stats.webhookStatus)}
                        <span className="text-xs text-muted-foreground">N8N</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{stats.totalInteractions}</div>
                    <div className="text-xs text-muted-foreground">Totaal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{stats.activeToday}</div>
                    <div className="text-xs text-muted-foreground">Vandaag</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{stats.successRate}%</div>
                    <div className="text-xs text-muted-foreground">Succes</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Capabilities:</div>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities?.map((cap) => (
                      <Badge key={cap} variant="outline" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>

                {agent.webhook_url && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                    <strong>Webhook:</strong> {agent.webhook_url.substring(0, 40)}...
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {agents.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Geen AI agents gevonden</p>
            <p className="text-sm text-muted-foreground mt-2">
              Ga naar Agent Beheer om nieuwe agents aan te maken
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
