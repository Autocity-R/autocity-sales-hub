import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Lead } from "@/types/leads";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Car, PhoneMissed, RefreshCw, Info, Mail, Phone } from "lucide-react";
import { parseLeadData } from "@/utils/leadParser";

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
  const parsedData = parseLeadData(lead);
  
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
        {/* Email Subject as Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Badge variant="outline" className="gap-1 shrink-0">
              {getTypeIcon(lead.source)}
              {getTypeLabel(lead.source)}
            </Badge>
            {parsedData.subject && (
              <h3 className="text-sm font-semibold truncate">
                {parsedData.subject}
              </h3>
            )}
          </div>
          {isUrgent && (
            <div className="h-2 w-2 bg-destructive rounded-full animate-pulse shrink-0" />
          )}
        </div>

        {/* Vehicle Interest & Details */}
        {parsedData.vehicleInterest && (
          <div className="space-y-1">
            <div className="text-base font-medium text-primary">
              {parsedData.vehicleInterest}
            </div>
            {(parsedData.vehicleYear || parsedData.vehicleMileage || parsedData.vehiclePrice) && (
              <div className="flex gap-3 text-xs text-muted-foreground">
                {parsedData.vehicleYear && <span>Bouwjaar: {parsedData.vehicleYear}</span>}
                {parsedData.vehicleMileage && <span>KM: {parsedData.vehicleMileage}</span>}
                {parsedData.vehiclePrice && <span className="font-medium text-foreground">{parsedData.vehiclePrice}</span>}
              </div>
            )}
          </div>
        )}

        {/* Customer Name */}
        <div className="text-sm font-medium">
          {parsedData.customerName}
        </div>

        {/* Contact Information */}
        <div className="space-y-1 text-sm">
          {parsedData.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span>{parsedData.email}</span>
            </div>
          )}
          {parsedData.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{parsedData.phone}</span>
            </div>
          )}
        </div>

        {/* Footer: Owner & Time */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
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
