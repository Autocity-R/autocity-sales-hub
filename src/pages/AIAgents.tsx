
import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AIAgentChat } from "@/components/ai-agents/AIAgentChat";

const AIAgents = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Agents
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Chat met AI agents die toegang hebben tot uw CRM systeem
          </p>
        </div>
        <AIAgentChat />
      </div>
    </DashboardLayout>
  );
};

export default AIAgents;
