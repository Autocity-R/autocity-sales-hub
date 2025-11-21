import { Badge } from "@/components/ui/badge";

interface OnlineStatusBadgeProps {
  isOnline: boolean;
  salesStatus?: string;
}

export const OnlineStatusBadge = ({ isOnline, salesStatus }: OnlineStatusBadgeProps) => {
  // Prioriteit: Verkocht > Online > Offline
  if (salesStatus === 'verkocht_b2b' || salesStatus === 'verkocht_b2c') {
    return (
      <Badge 
        variant="default" 
        className="bg-blue-500 text-white hover:bg-blue-600"
      >
        Verkocht
      </Badge>
    );
  }
  
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
