import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductionAIAgentChat } from "@/components/ai-agents/ProductionAIAgentChat";
import { WebhookConfiguration } from "@/components/ai-agents/WebhookConfiguration";
import { AIAgentManagement } from "@/components/settings/AIAgentManagement";
import { HendrikSalesDashboard } from "@/components/sales/HendrikSalesDashboard";
import { HendrikBriefingDashboard } from "@/components/ai-agents/HendrikBriefingDashboard";
import { SalesAgentChat } from "@/components/sales/SalesAgentChat";
import { AgentOverviewDashboard } from "@/components/ai-agents/AgentOverviewDashboard";
import { RobinCalendarDashboard } from "@/components/ai-agents/RobinCalendarDashboard";
import { 
  Brain, 
  Settings, 
  Webhook, 
  TrendingUp, 
  MessageSquare, 
  BarChart3,
  Calendar,
  FileText
} from "lucide-react";

const AIAgents = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agents Control Center</h1>
          <p className="text-muted-foreground">
            Centraal dashboard voor alle AI agents met gespecialiseerde interfaces
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overzicht
            </TabsTrigger>
            <TabsTrigger value="briefings" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Briefings
            </TabsTrigger>
            <TabsTrigger value="robin-dashboard" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Robin
            </TabsTrigger>
            <TabsTrigger value="hendrik-dashboard" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Hendrik
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="all-agents" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Beheer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <AgentOverviewDashboard />
          </TabsContent>

          <TabsContent value="briefings" className="space-y-4">
            <HendrikBriefingDashboard />
          </TabsContent>

          <TabsContent value="robin-dashboard" className="space-y-4">
            <RobinCalendarDashboard />
          </TabsContent>

          <TabsContent value="hendrik-dashboard" className="space-y-4">
            <HendrikSalesDashboard />
          </TabsContent>

          <TabsContent value="chat" className="space-y-4">
            <SalesAgentChat />
          </TabsContent>

          <TabsContent value="all-agents" className="space-y-4">
            <ProductionAIAgentChat />
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <WebhookConfiguration />
          </TabsContent>

          <TabsContent value="management" className="space-y-4">
            <AIAgentManagement />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AIAgents;
