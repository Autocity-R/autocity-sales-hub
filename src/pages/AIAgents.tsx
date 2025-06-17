
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductionAIAgentChat } from "@/components/ai-agents/ProductionAIAgentChat";
import { WebhookConfiguration } from "@/components/ai-agents/WebhookConfiguration";
import { AIAgentManagement } from "@/components/settings/AIAgentManagement";
import { HendrikSalesDashboard } from "@/components/sales/HendrikSalesDashboard";
import { SalesAgentChat } from "@/components/sales/SalesAgentChat";
import { Brain, Settings, Webhook, TrendingUp, MessageSquare } from "lucide-react";

const AIAgents = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-muted-foreground">
            Beheer en communiceer met AI agents voor verschillende business processen
          </p>
        </div>

        <Tabs defaultValue="sales-dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="sales-dashboard" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Hendrik Dashboard
            </TabsTrigger>
            <TabsTrigger value="sales-chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat met Hendrik
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Alle Agents
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Agent Beheer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales-dashboard" className="space-y-4">
            <HendrikSalesDashboard />
          </TabsContent>

          <TabsContent value="sales-chat" className="space-y-4">
            <SalesAgentChat />
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
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
