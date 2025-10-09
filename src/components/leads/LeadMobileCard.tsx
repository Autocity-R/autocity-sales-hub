import React from "react";
import { Lead, LeadStatus } from "@/types/leads";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Mail, Phone, Car, User } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { parseLeadData } from "@/utils/leadParser";

interface LeadMobileCardProps {
  lead: Lead;
  onLeadClick: (lead: Lead) => void;
  onDisqualifyLead: (lead: Lead) => void;
  salespeople: Array<{ id: string; name: string }>;
}

export const LeadMobileCard: React.FC<LeadMobileCardProps> = ({
  lead,
  onLeadClick,
  onDisqualifyLead,
  salespeople,
}) => {
  const parsedData = parseLeadData(lead);
  const assignedPerson = salespeople.find(p => p.id === lead.assignedTo);

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'contacted': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'appointment': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'won': return 'bg-green-100 text-green-800 border-green-300';
      case 'lost': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: LeadStatus) => {
    const labels: Record<LeadStatus, string> = {
      new: 'Nieuw',
      contacted: 'Gecontacteerd',
      appointment: 'Afspraak',
      won: 'Gewonnen',
      lost: 'Verloren'
    };
    return labels[status];
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      website: 'Website',
      facebook: 'Facebook',
      autotrack: 'AutoTrack',
      marktplaats: 'Marktplaats',
      referral: 'Doorverwijzing',
      phone: 'Telefoon',
      other: 'Overig'
    };
    return labels[source] || source;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500 text-white';
    if (score >= 60) return 'bg-yellow-500 text-white';
    return 'bg-red-500 text-white';
  };

  return (
    <Card 
      className="mb-3 touch-manipulation cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onLeadClick(lead)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Score Badge */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getScoreColor(lead.lead_score || 0)}`}>
              {lead.lead_score || 0}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight truncate">
                {parsedData.customerName}
              </h3>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant="outline" className={getStatusColor(lead.status)}>
                  {getStatusLabel(lead.status)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getSourceLabel(lead.source)}
                </Badge>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onLeadClick(lead); }}>
                Details bekijken
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDisqualifyLead(lead); }}>
                Diskwalificeren
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* Contact Information */}
        <div className="space-y-1.5">
          {parsedData.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <a 
                href={`mailto:${parsedData.email}`}
                className="text-primary hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {parsedData.email}
              </a>
            </div>
          )}
          {parsedData.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <a 
                href={`tel:${parsedData.phone}`}
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {parsedData.phone}
              </a>
            </div>
          )}
        </div>

        {/* Vehicle Interest */}
        {parsedData.vehicleInterest && (
          <div className="flex items-start gap-2 text-sm">
            <Car className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-muted-foreground line-clamp-2">{parsedData.vehicleInterest}</span>
          </div>
        )}

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span>{assignedPerson?.name || 'Niet toegewezen'}</span>
          </div>
          <span>{format(new Date(lead.createdAt), 'dd MMM yyyy', { locale: nl })}</span>
        </div>
      </CardContent>
    </Card>
  );
};
