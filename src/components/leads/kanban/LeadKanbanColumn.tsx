import { Lead } from "@/types/leads";
import { LeadCard } from "./LeadCard";
import { Badge } from "@/components/ui/badge";
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
    <div className="flex-shrink-0 w-72 flex flex-col">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn("w-2 h-2 rounded-full", status.color)} />
        <h3 className="font-semibold text-sm text-foreground">{status.label}</h3>
        <Badge variant="secondary" className="ml-auto text-xs h-5 px-2">
          {leads.length}
        </Badge>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex-1 bg-muted/20 rounded-lg p-2 space-y-2 min-h-[400px] transition-colors",
          isDragOver && "bg-primary/10 ring-2 ring-primary ring-inset",
          !isDragOver && "border border-border/50"
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
