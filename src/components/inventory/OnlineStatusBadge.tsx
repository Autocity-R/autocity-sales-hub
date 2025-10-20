import { Badge } from "@/components/ui/badge";

interface OnlineStatusBadgeProps {
  isOnline: boolean;
}

export const OnlineStatusBadge = ({ isOnline }: OnlineStatusBadgeProps) => {
  return (
    <Badge 
      variant="default" 
      className={isOnline 
        ? "bg-green-500 text-white hover:bg-green-600" 
        : "bg-red-500 text-white hover:bg-red-600"
      }
    >
      {isOnline ? "Online" : "Offline"}
    </Badge>
  );
};
