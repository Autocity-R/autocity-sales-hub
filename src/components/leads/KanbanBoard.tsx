import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lead, LeadStatus } from "@/types/leads";
import { leadDisplayConfig } from "@/utils/leadDisplayConfig";
import { Salesperson } from "@/hooks/useSalespeople";

interface KanbanBoardProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  salespeople: Salesperson[];
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  leads, 
  onLeadClick,
  salespeople 
}) => {
  const statuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  
  return (
    <div className="grid grid-cols-7 gap-4 h-full overflow-x-auto">
      {statuses.map(status => {
        const statusLeads = leads.filter(l => l.status === status);
        const statusConfig = leadDisplayConfig.status[status];
        
        return (
          <div key={status} className="flex flex-col min-w-[200px]">
            <div className={`p-3 rounded-t-lg ${statusConfig.color} text-white`}>
              <h3 className="font-semibold text-sm">{statusConfig.label}</h3>
              <span className="text-xs opacity-90">
                {statusLeads.length} leads
              </span>
            </div>
            <div className="flex-1 bg-muted/50 rounded-b-lg p-2 space-y-2 min-h-96 overflow-y-auto">
              {statusLeads.map(lead => {
                const sourceConfig = leadDisplayConfig.source[lead.source];
                const assignedSalesperson = salespeople.find(s => s.id === lead.assignedTo);
                
                return (
                  <Card 
                    key={lead.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onLeadClick(lead)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {lead.firstName} {lead.lastName}
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs">{sourceConfig?.icon}</span>
                          <Badge variant="secondary" className="text-xs">
                            {lead.lead_score || 50}/100
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2 truncate">
                        {lead.interestedVehicle || 'Geen voertuig opgegeven'}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {assignedSalesperson ? assignedSalesperson.name : 'Niet toegewezen'}
                        </span>
                        {lead.vehicleUrl && (
                          <a 
                            href={lead.vehicleUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            📎 Advertentie
                          </a>
                        )}
                      </div>
                      
                      <div className="mt-2 text-xs text-muted-foreground">
                        {sourceConfig?.label} • {new Date(lead.createdAt).toLocaleDateString('nl-NL')}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
