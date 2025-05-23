
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lead, LeadStatus } from "@/types/leads";
import { format } from "date-fns";

interface LeadPipelineProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export const LeadPipeline: React.FC<LeadPipelineProps> = ({ leads, onLeadClick }) => {
  const statusColumns: { status: LeadStatus; label: string; color: string }[] = [
    { status: 'new', label: 'Nieuw', color: 'bg-blue-500' },
    { status: 'contacted', label: 'Gecontacteerd', color: 'bg-yellow-500' },
    { status: 'qualified', label: 'Gekwalificeerd', color: 'bg-purple-500' },
    { status: 'proposal', label: 'Offerte', color: 'bg-orange-500' },
    { status: 'negotiation', label: 'Onderhandeling', color: 'bg-indigo-500' },
    { status: 'won', label: 'Gewonnen', color: 'bg-green-500' },
    { status: 'lost', label: 'Verloren', color: 'bg-red-500' }
  ];

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter(lead => lead.status === status);
  };

  const getTotalValue = (leads: Lead[]) => {
    return leads.reduce((sum, lead) => sum + (lead.budget || 0), 0);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {statusColumns.map((column) => {
          const columnLeads = getLeadsByStatus(column.status);
          const totalValue = getTotalValue(columnLeads);
          
          return (
            <div key={column.status} className="space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{column.label}</span>
                    <Badge variant="secondary">{columnLeads.length}</Badge>
                  </CardTitle>
                  {totalValue > 0 && (
                    <p className="text-xs text-muted-foreground">
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
