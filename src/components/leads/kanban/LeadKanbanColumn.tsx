import { Lead } from "@/types/leads";
import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface LeadKanbanColumnProps {
  status: { value: string; label: string; color: string };
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onDragStart: (lead: Lead) => void;
  onDragEnd: () => void;
  onDrop: (status: string) => void;
  isDragging: boolean;
}

export function LeadKanbanColumn({
  status,
  leads,
  onLeadClick,
  onDragStart,
  onDragEnd,
  onDrop,
  isDragging,
}: LeadKanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(status.value);
  };

  return (
    <div className="flex-shrink-0 w-80 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className={cn("w-3 h-3 rounded-full", status.color)} />
        <h3 className="font-semibold text-foreground">{status.label}</h3>
        <span className="ml-auto text-sm text-muted-foreground">
          {leads.length}
        </span>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex-1 bg-muted/30 rounded-lg p-3 space-y-3 min-h-[200px] transition-colors",
          isDragOver && "bg-primary/10 border-2 border-primary border-dashed",
          !isDragOver && "border-2 border-transparent"
        )}
      >
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onLeadClick(lead)}
            onDragStart={() => onDragStart(lead)}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}
