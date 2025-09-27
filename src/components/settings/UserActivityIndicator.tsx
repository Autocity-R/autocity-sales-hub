import React from "react";
import { Badge } from "@/components/ui/badge";
import { UserProfile } from "@/services/userService";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface UserActivityIndicatorProps {
  user: UserProfile;
  className?: string;
}

export const UserActivityIndicator: React.FC<UserActivityIndicatorProps> = ({ 
  user, 
  className = "" 
}) => {
  const getActivityStatus = () => {
    // Check if user was created recently (within last 7 days)
    const createdAt = new Date(user.created_at);
    const daysSinceCreated = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceCreated <= 1) {
      return {
        status: "new",
        label: "Nieuw",
        variant: "default" as const,
        icon: <CheckCircle className="h-3 w-3" />
      };
    }
    
    if (daysSinceCreated <= 7) {
      return {
        status: "recent",
        label: "Recent",
        variant: "secondary" as const,
        icon: <Clock className="h-3 w-3" />
      };
    }
    
    return {
      status: "active",
      label: "Actief",
      variant: "outline" as const,
      icon: <CheckCircle className="h-3 w-3" />
    };
  };

  const activity = getActivityStatus();

  return (
    <Badge variant={activity.variant} className={`flex items-center gap-1 ${className}`}>
      {activity.icon}
      {activity.label}
    </Badge>
  );
};