
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIAgentChat } from "@/components/ai-agents/AIAgentChat";
import { WebhookConfiguration } from "@/components/ai-agents/WebhookConfiguration";
import { Bot, Zap, Settings } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const AIAgents = () => {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <PageHeader 
        title="AI Agents" 
        description="Beheer en chat met AI agents die gekoppeld zijn aan n8n workflows"
        icon={Bot}
      />
      
      <div className="container mx-auto p-6">
        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Instellingen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <AIAgentChat />
          </TabsContent>

          <TabsContent value="webhooks">
            <WebhookConfiguration />
          </TabsContent>

          <TabsContent value="settings">
            <div className="text-center py-12 text-muted-foreground">
              Agent instellingen komen binnenkort beschikbaar
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AIAgents;
