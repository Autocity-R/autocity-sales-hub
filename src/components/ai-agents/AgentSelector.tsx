import React from "react";
import { AgentConfig } from "./agentConfig";
import { cn } from "@/lib/utils";

interface AgentSelectorProps {
  agents: AgentConfig[];
  selectedAgent: AgentConfig | null;
  onSelect: (agent: AgentConfig) => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ agents, selectedAgent, onSelect }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {agents.map((agent) => {
        const isSelected = selectedAgent?.id === agent.id;
        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent)}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg",
              isSelected
                ? "border-blue-500 bg-blue-500/10 shadow-md"
                : "border-border bg-card hover:border-muted-foreground/30"
            )}
          >
            {/* Live indicator */}
            <div className="absolute top-2 right-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
            </div>

            {/* Avatar */}
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg",
              agent.color.bg
            )}>
              {agent.name[0]}
            </div>

            {/* Name & Role */}
            <div className="text-center">
              <p className="font-semibold text-sm text-foreground">{agent.name}</p>
              <p className="text-xs text-muted-foreground leading-tight">{agent.role}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
