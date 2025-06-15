
import React, { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIAgentChat } from "@/components/ai-agents/AIAgentChat";
import { WebhookConfiguration } from "@/components/ai-agents/WebhookConfiguration";
import { AgentDataManagement } from "@/components/ai-agents/AgentDataManagement";
import { Bot, Zap, Settings, Database } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/contexts/AuthContext";
import { ensureCalendarAssistantExists } from "@/services/calendarAssistantService";
import { useToast } from "@/hooks/use-toast";

const AIAgents = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  // Initialize Calendar Assistant on component mount
  useEffect(() => {
    const initializeCalendarAssistant = async () => {
      try {
        console.log('🚀 Initializing Calendar Assistant...');
        const result = await ensureCalendarAssistantExists();
        
        if (result.success) {
          console.log('✅ Calendar Assistant ready for n8n integration');
        } else {
          console.error('❌ Failed to initialize Calendar Assistant:', result.error);
        }
      } catch (error) {
        console.error('❌ Error initializing Calendar Assistant:', error);
      }
    };

    initializeCalendarAssistant();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <PageHeader 
        title="AI Agents" 
        description="Calendar Assistant met volledige CRM toegang voor n8n workflows - Afspraken, Klanten, Voertuigen, Garantie & Leen Auto's"
        icon={Bot}
      />
      
      <div className="container mx-auto p-6">
        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className={isAdmin ? "grid w-full grid-cols-4" : "grid w-full grid-cols-2"}>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Calendar Assistant
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="webhooks" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  n8n Webhooks
                </TabsTrigger>
                <TabsTrigger value="data" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  CRM Data Toegang
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Instellingen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <AIAgentChat />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="webhooks">
                <WebhookConfiguration />
              </TabsContent>

              <TabsContent value="data">
                <AgentDataManagement />
              </TabsContent>
            </>
          )}

          <TabsContent value="settings">
            <div className="text-center py-12 text-muted-foreground">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Calendar Assistant Configuratie</h3>
                <div className="max-w-2xl mx-auto text-left space-y-2">
                  <p><strong>✅ Afspraken Beheer:</strong> Volledig create, read, update toegang</p>
                  <p><strong>👥 Contacten/Klanten:</strong> Toegang tot alle klantgegevens</p>
                  <p><strong>🚗 Voertuigen:</strong> Volledige voorraad voor planning</p>
                  <p><strong>🔧 Garantie Claims:</strong> Service afspraken beheer</p>
                  <p><strong>🚙 Leen Auto's:</strong> Beschikbaarheid en toewijzing</p>
                  <p><strong>📊 CRM Data:</strong> Real-time context voor n8n workflows</p>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Alle CRM data wordt automatisch meegestuurd naar je n8n workflows
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AIAgents;
