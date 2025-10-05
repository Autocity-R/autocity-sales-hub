import { Lead } from "@/types/leads";
import { LeadKanbanColumn } from "./kanban/LeadKanbanColumn";
import { useState } from "react";

interface LeadKanbanBoardProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
}

const LEAD_STATUSES = [
  { value: 'new', label: 'Nieuw', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Gecontacteerd', color: 'bg-yellow-500' },
  { value: 'appointment_planned', label: 'Afspraak Gepland', color: 'bg-purple-500' },
  { value: 'negotiation', label: 'Onderhandeling', color: 'bg-orange-500' },
  { value: 'won', label: 'Gewonnen', color: 'bg-green-500' },
  { value: 'lost', label: 'Verloren', color: 'bg-red-500' },
];

export function LeadKanbanBoard({ leads, onLeadClick, onStatusChange }: LeadKanbanBoardProps) {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
  };

  const handleDrop = (status: string) => {
    if (draggedLead && draggedLead.status !== status) {
      onStatusChange(draggedLead.id, status);
    }
    setDraggedLead(null);
  };

  const getLeadsByStatus = (status: string) => {
    return leads.filter(lead => lead.status === status);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {LEAD_STATUSES.map((status) => (
        <LeadKanbanColumn
          key={status.value}
          status={status}
          leads={getLeadsByStatus(status.value)}
          onLeadClick={onLeadClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          isDragging={draggedLead !== null}
        />
      ))}
    </div>
  );
}
