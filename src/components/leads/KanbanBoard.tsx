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
  const statuses: LeadStatus[] = ['new', 'contacted', 'appointment', 'won', 'lost'];
  
  return (
    <div className="grid grid-cols-7 gap-4 h-full overflow-x-auto p-6">
      {statuses.map(status => {
        const statusLeads = leads.filter(l => l.status === status);
        const statusConfig = leadDisplayConfig.status[status];
        
        return (
          <div key={status} className="flex flex-col min-w-[200px]">
            <div className={`p-4 rounded-t-xl text-white font-semibold text-center shadow-sm ${statusConfig.color}`}>
              <h3 className="font-bold text-sm">{statusConfig.label}</h3>
              <span className="text-xs opacity-90">
                {statusLeads.length} leads
              </span>
            </div>
            <div className="flex-1 bg-gray-50 rounded-b-xl p-3 space-y-3 min-h-96 overflow-y-auto">
              {statusLeads.map(lead => {
                const sourceConfig = leadDisplayConfig.source[lead.source];
                const assignedSalesperson = salespeople.find(s => s.id === lead.assignedTo);
                
                return (
                  <Card 
                    key={lead.id} 
                    className="bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => onLeadClick(lead)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900 text-sm">
                          {lead.firstName} {lead.lastName}
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className="text-lg">{sourceConfig?.icon}</span>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs px-2 py-1">
                            {lead.lead_score || 50}/100
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-xs mb-3 truncate">
                        {lead.interestedVehicle || 'Geen voertuig opgegeven'}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-gray-500">
                          {assignedSalesperson ? assignedSalesperson.name : 'Niet toegewezen'}
                        </span>
                        {lead.vehicleUrl && (
                          <a 
                            href={lead.vehicleUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>📎</span>
                            <span>Advertentie</span>
                          </a>
                        )}
                      </div>
                      
                      <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                        <span>{sourceConfig?.label}</span>
                        <span>{new Date(lead.createdAt).toLocaleDateString('nl-NL')}</span>
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
