import { Lead } from "@/types/leads";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Car, Mail, Phone, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function LeadCard({ lead, onClick, onDragStart, onDragEnd }: LeadCardProps) {
  const isUrgent = () => {
    if (lead.status !== 'new') return false;
    const createdAt = new Date(lead.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 24;
  };

  const getSourceIcon = () => {
    const source = lead.source?.toLowerCase() || '';
    if (source.includes('autoscout')) return '🚗';
    if (source.includes('marktplaats')) return '🏪';
    if (source.includes('autotrack')) return '📊';
    if (source.includes('website')) return '🌐';
    return '📧';
  };

  const getOwnerInitials = () => {
    if (!lead.owner_id) return '?';
    // This would be replaced with actual owner name from profiles
    return 'VK';
  };

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
        "bg-card border border-border"
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isUrgent() && (
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              )}
              <h4 className="font-semibold text-sm text-foreground line-clamp-1">
                {lead.firstName} {lead.lastName}
              </h4>
            </div>
            {lead.company && (
              <p className="text-xs text-muted-foreground mt-1">{lead.company}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg">{getSourceIcon()}</span>
            {lead.owner_id && (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {getOwnerInitials()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>

        {/* Vehicle Interest */}
        {lead.interestedVehicle && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Car className="h-3 w-3" />
            <span className="line-clamp-1">{lead.interestedVehicle}</span>
          </div>
        )}

        {/* Contact Info */}
        <div className="flex flex-wrap gap-2">
          {lead.email && (
            <Badge variant="outline" className="text-xs gap-1">
              <Mail className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{lead.email}</span>
            </Badge>
          )}
          {lead.phone && (
            <Badge variant="outline" className="text-xs gap-1">
              <Phone className="h-3 w-3" />
              {lead.phone}
            </Badge>
          )}
        </div>

        {/* Priority */}
        {lead.priority && (
          <Badge
            variant={lead.priority === 'high' ? 'destructive' : 'secondary'}
            className="text-xs w-fit"
          >
            {lead.priority === 'high' ? 'Hoog' : lead.priority === 'medium' ? 'Gemiddeld' : 'Laag'}
          </Badge>
        )}
      </div>
    </Card>
  );
}
