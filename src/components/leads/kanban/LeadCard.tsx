import { Lead } from "@/types/leads";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Car, Phone, PhoneCall, PhoneMissed, RefreshCw, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function LeadCard({ lead, onClick, onDragStart, onDragEnd }: LeadCardProps) {
  const isUrgent = () => {
    if (lead.status !== 'new') return false;
    const createdAt = new Date(lead.created_at || lead.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 24;
  };

  const getSourceInfo = () => {
    const source = lead.source?.toLowerCase() || '';
    const email = (lead as any).source_email?.toLowerCase() || '';
    
    if (source.includes('autoscout') || email.includes('autoscout')) {
      return { icon: '🚗', color: 'bg-orange-500', label: 'AutoScout24' };
    }
    if (source.includes('marktplaats') || email.includes('marktplaats')) {
      return { icon: '🏪', color: 'bg-blue-500', label: 'Marktplaats' };
    }
    if (source.includes('autotrack') || email.includes('autotrack')) {
      return { icon: '📊', color: 'bg-purple-500', label: 'AutoTrack' };
    }
    if (source.includes('website')) {
      return { icon: '🌐', color: 'bg-green-500', label: 'Website' };
    }
    return { icon: '📧', color: 'bg-gray-500', label: 'Email' };
  };

  const getRequestType = () => {
    const notes = lead.notes?.toLowerCase() || '';
    const vehicle = lead.interestedVehicle?.toLowerCase() || '';
    const email = (lead as any).source_email?.toLowerCase() || '';
    
    if (notes.includes('inruil') || vehicle.includes('inruil') || email.includes('inruil')) {
      return { icon: <RefreshCw className="h-3 w-3" />, color: 'bg-blue-100 text-blue-700', label: 'Inruil' };
    }
    if (notes.includes('proefrit') || notes.includes('testrit') || email.includes('proefrit')) {
      return { icon: <Car className="h-3 w-3" />, color: 'bg-green-100 text-green-700', label: 'Proefrit' };
    }
    if (notes.includes('gemiste') || notes.includes('missed') || email.includes('call')) {
      return { icon: <PhoneMissed className="h-3 w-3" />, color: 'bg-red-100 text-red-700', label: 'Gemiste oproep' };
    }
    if (lead.phone) {
      return { icon: <Phone className="h-3 w-3" />, color: 'bg-yellow-100 text-yellow-700', label: 'Telefonisch' };
    }
    return null;
  };

  const getOwnerInitials = () => {
    if (!lead.owner_id) return null;
    // This would be replaced with actual owner name from profiles
    // For now, generate from owner_id
    return 'VK';
  };

  const getTimeSinceLastActivity = () => {
    const lastActivity = lead.lastContactDate || lead.created_at || lead.createdAt;
    if (!lastActivity) return 'Nieuw';
    
    return formatDistanceToNow(new Date(lastActivity), { 
      addSuffix: true, 
      locale: nl 
    });
  };

  const sourceInfo = getSourceInfo();
  const requestType = getRequestType();
  const ownerInitials = getOwnerInitials();

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "p-3 cursor-pointer hover:shadow-md transition-all",
        "bg-card border border-border hover:border-primary/50",
        isUrgent() && "border-l-4 border-l-destructive"
      )}
    >
      <div className="space-y-2">
        {/* Header: Name + Source */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {isUrgent() && <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
            <h4 className="font-semibold text-sm text-foreground truncate">
              {lead.firstName} {lead.lastName}
            </h4>
          </div>
          <div className={cn("flex-shrink-0 w-5 h-5 rounded flex items-center justify-center", sourceInfo.color)}>
            <span className="text-xs">{sourceInfo.icon}</span>
          </div>
        </div>

        {/* Vehicle Interest */}
        {lead.interestedVehicle && (
          <p className="text-xs text-foreground line-clamp-1">
            {lead.interestedVehicle}
            {lead.budget && (
              <span className="text-primary font-semibold ml-1">
                €{lead.budget.toLocaleString()}
              </span>
            )}
          </p>
        )}

        {/* Request Type Badge */}
        {requestType && (
          <Badge variant="outline" className={cn("text-xs gap-1 h-5 w-fit", requestType.color)}>
            {requestType.icon}
            <span>{requestType.label}</span>
          </Badge>
        )}

        {/* Footer: Time + Owner */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{getTimeSinceLastActivity()}</span>
          </div>
          
          {ownerInitials ? (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                {ownerInitials}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">?</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

