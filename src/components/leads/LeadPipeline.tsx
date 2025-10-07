
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lead, LeadStatus } from "@/types/leads";
import { format } from "date-fns";

interface LeadPipelineProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusClick?: (status: LeadStatus) => void;
}

interface LeadPipelineProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusClick?: (status: LeadStatus) => void;
  onDisqualifyClick?: (lead: Lead) => void;
  showArchived?: boolean;
}

export const LeadPipeline: React.FC<LeadPipelineProps> = ({ 
  leads, 
  onLeadClick, 
  onStatusClick,
  onDisqualifyClick,
  showArchived = false
}) => {
  // Active pipeline columns (default view)
  const activePipelineColumns: { status: LeadStatus; label: string; color: string; description: string }[] = [
    { status: 'new', label: 'Nieuw', color: 'bg-blue-500', description: 'Lead Inbox - Te kwalificeren' },
    { status: 'contacted', label: 'Gecontacteerd', color: 'bg-yellow-500', description: 'Eerste contact gelegd' },
    { status: 'appointment', label: 'Afspraak', color: 'bg-purple-500', description: 'Afspraak gepland' },
  ];

  // Endpoint columns (archived after 7 days)
  const endpointColumns: { status: LeadStatus; label: string; color: string; description: string }[] = [
    { status: 'won', label: 'Gewonnen', color: 'bg-green-500', description: 'Deal gesloten' },
    { status: 'lost', label: 'Verloren', color: 'bg-red-500', description: 'Diskwalificatie' }
  ];

  const statusColumns = showArchived 
    ? [...activePipelineColumns, ...endpointColumns]
    : activePipelineColumns;

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter(lead => lead.status === status);
  };

  const getTotalValue = (leads: Lead[]) => {
    return leads.reduce((sum, lead) => sum + (lead.budget || 0), 0);
  };

  const filteredLeads = showArchived 
    ? leads 
    : leads.filter(lead => !['won', 'lost'].includes(lead.status));

  return (
    <div className="space-y-4">
      {!showArchived && (
        <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-900">
            <strong>💡 Actieve Verkooppijplijn:</strong> Alleen actieve leads worden getoond. 
            Gewonnen en Verloren leads worden na 7 dagen automatisch gearchiveerd.
          </div>
        </div>
      )}
      
      <div className={`grid grid-cols-1 gap-4 ${showArchived ? 'lg:grid-cols-7' : 'lg:grid-cols-5'}`}>
        {statusColumns.map((column) => {
          const columnLeads = getLeadsByStatus(column.status).filter(lead => 
            showArchived || !['won', 'lost'].includes(lead.status)
          );
          const totalValue = getTotalValue(columnLeads);
          
          return (
            <div key={column.status} className="space-y-3">
              <Card 
                className={`${
                  onStatusClick ? 'cursor-pointer hover:shadow-md transition-shadow hover:bg-accent' : ''
                }`}
                onClick={() => onStatusClick?.(column.status)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{column.label}</span>
                    <Badge variant="secondary">{columnLeads.length}</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {column.description}
                  </p>
                  {totalValue > 0 && (
                    <p className="text-xs font-medium text-green-600">
                      € {totalValue.toLocaleString()}
                    </p>
                  )}
                </CardHeader>
              </Card>
              
              <div className="space-y-2">
                {columnLeads.map((lead) => (
                  <Card 
                    key={lead.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onLeadClick(lead)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">
                            {lead.firstName} {lead.lastName}
                          </h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              lead.priority === 'urgent' ? 'border-red-500 text-red-700' :
                              lead.priority === 'high' ? 'border-orange-500 text-orange-700' :
                              lead.priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                              'border-green-500 text-green-700'
                            }`}
                          >
                            {lead.priority}
                          </Badge>
                        </div>
                        
                        {lead.company && (
                          <p className="text-xs text-muted-foreground">{lead.company}</p>
                        )}
                        
                        {lead.interestedVehicle && (
                          <p className="text-xs font-medium">{lead.interestedVehicle}</p>
                        )}
                        
                        {lead.budget && (
                          <p className="text-xs text-green-600 font-medium">
                            € {lead.budget.toLocaleString()}
                          </p>
                        )}
                        
                        {lead.assignedTo && (
                          <p className="text-xs text-blue-600">
                            👤 {lead.assignedTo}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{format(new Date(lead.createdAt), 'dd/MM')}</span>
                          <span>{lead.conversionProbability}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
