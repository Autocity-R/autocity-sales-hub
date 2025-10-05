import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Lead } from "@/types/leads";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Car, PhoneMissed, RefreshCw, Info } from "lucide-react";

interface LeadListCardProps {
  lead: Lead;
  ownerInitials?: string;
  onLeadClick: (lead: Lead) => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'proefrit':
      return <Car className="h-3 w-3" />;
    case 'inruil':
      return <RefreshCw className="h-3 w-3" />;
    case 'gemiste_oproep':
      return <PhoneMissed className="h-3 w-3" />;
    default:
      return <Info className="h-3 w-3" />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'proefrit':
      return 'Proefrit';
    case 'inruil':
      return 'Inruil';
    case 'gemiste_oproep':
      return 'Gemiste oproep';
    default:
      return 'Info';
  }
};

export function LeadListCard({ lead, ownerInitials, onLeadClick }: LeadListCardProps) {
  const isUrgent = lead.status === 'new' && 
    new Date().getTime() - new Date(lead.createdAt).getTime() > 24 * 60 * 60 * 1000;

  const timeAgo = formatDistanceToNow(new Date(lead.createdAt), {
    addSuffix: true,
    locale: nl,
  });

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onLeadClick(lead)}
    >
      <div className="space-y-3">
        {/* Header: Type Badge */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="gap-1">
            {getTypeIcon(lead.source)}
            {getTypeLabel(lead.source)}
          </Badge>
          {isUrgent && (
            <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
          )}
        </div>

        {/* Lead Name */}
        <div>
          <h3 className="text-lg font-semibold">
            {lead.firstName} {lead.lastName}
          </h3>
        </div>

        {/* Vehicle Interest */}
        {lead.interestedVehicle && (
          <div className="text-sm text-muted-foreground">
            {lead.interestedVehicle}
          </div>
        )}

        {/* Footer: Owner & Time */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {ownerInitials ? (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">{ownerInitials}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs">?</span>
              </div>
            )}
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
