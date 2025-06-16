
import React from "react";
import { AgentSelectionPanel } from "./chat/AgentSelectionPanel";
import { ChatInterface } from "./chat/ChatInterface";
import { useProductionAIChat } from "@/hooks/useProductionAIChat";

export const ProductionAIAgentChat = () => {
  const {
    agents,
    selectedAgent,
    selectedAgentData,
    session,
    messages,
    message,
    agentsLoading,
    chatLoading,
    isInitializing,
    handleSendMessage,
    handleKeyPress,
    handleAgentChange,
    handleRefreshAgents,
    setMessage,
    endSession,
  } = useProductionAIChat();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <AgentSelectionPanel
        agents={agents}
        selectedAgent={selectedAgent}
        selectedAgentData={selectedAgentData}
        session={session}
        messages={messages}
        agentsLoading={agentsLoading}
        onAgentChange={handleAgentChange}
        onRefreshAgents={handleRefreshAgents}
        onEndSession={endSession}
      />

      <ChatInterface
        selectedAgent={selectedAgent}
        selectedAgentData={selectedAgentData}
        messages={messages}
        message={message}
        chatLoading={chatLoading}
        isInitializing={isInitializing}
        onMessageChange={setMessage}
        onSendMessage={handleSendMessage}
        onKeyPress={handleKeyPress}
      />
    </div>
  );
};
