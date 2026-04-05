import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { AgentSelector } from "@/components/ai-agents/AgentSelector";
import { AgentChat } from "@/components/ai-agents/AgentChat";
import { AgentConfig, getAccessibleAgents } from "@/components/ai-agents/agentConfig";
import { MarcoDashboard } from "@/components/ai-agents/dashboards/MarcoDashboard";
import { LisaDashboard } from "@/components/ai-agents/dashboards/LisaDashboard";
import { DaanDashboard } from "@/components/ai-agents/dashboards/DaanDashboard";
import { SaraDashboard } from "@/components/ai-agents/dashboards/SaraDashboard";
import { AlexDashboard } from "@/components/ai-agents/dashboards/AlexDashboard";
import { KevinDashboard } from "@/components/ai-agents/dashboards/KevinDashboard";
import { KevinFastMovers } from "@/components/ai-agents/dashboards/kevin/KevinFastMovers";
import { LayoutDashboard, MessageSquare, Zap } from "lucide-react";

const DASHBOARD_MAP: Record<string, React.FC> = {
  Marco: MarcoDashboard,
  Lisa: LisaDashboard,
  Daan: DaanDashboard,
  Kevin: KevinDashboard,
  Sara: SaraDashboard,
  Alex: AlexDashboard,
};

const AIAgents = () => {
  const { userRole } = useRoleAccess();
  const accessibleAgents = getAccessibleAgents(userRole);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(
    accessibleAgents.length > 0 ? accessibleAgents[0] : null
  );

  const DashboardComponent = selectedAgent ? DASHBOARD_MAP[selectedAgent.name] : null;
  const isKevin = selectedAgent?.name === 'Kevin';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Team</h1>
          <p className="text-muted-foreground">
            Jouw AI team — selecteer een agent voor dashboard en chat
          </p>
        </div>

        {accessibleAgents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Je hebt geen toegang tot AI agents.
          </div>
        ) : (
          <>
            <AgentSelector
              agents={accessibleAgents}
              selectedAgent={selectedAgent}
              onSelect={setSelectedAgent}
            />

            {selectedAgent && (
              <Tabs defaultValue="dashboard" className="w-full">
                <TabsList>
                  <TabsTrigger value="dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </TabsTrigger>
                  {isKevin && (
                    <TabsTrigger value="fast-movers" className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Fast Movers
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="chat" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-4">
                  {DashboardComponent && <DashboardComponent />}
                </TabsContent>

                {isKevin && (
                  <TabsContent value="fast-movers" className="mt-4">
                    <KevinFastMovers />
                  </TabsContent>
                )}

                <TabsContent value="chat" className="mt-4">
                  <AgentChat agent={selectedAgent} />
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AIAgents;
