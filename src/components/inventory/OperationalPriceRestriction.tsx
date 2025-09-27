import React from "react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff } from "lucide-react";

interface OperationalPriceRestrictionProps {
  price?: number | null;
  label?: string;
  children?: React.ReactNode;
}

export const OperationalPriceRestriction: React.FC<OperationalPriceRestrictionProps> = ({ 
  price, 
  label = "Prijs", 
  children 
}) => {
  const { hasPriceAccess } = useRoleAccess();

  if (!hasPriceAccess()) {
    return (
      <div className="flex items-center gap-2">
        <EyeOff className="h-4 w-4 text-muted-foreground" />
        <Badge variant="secondary" className="text-muted-foreground">
          {label} niet zichtbaar
        </Badge>
      </div>
    );
  }

  if (children) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center gap-2">
      <Eye className="h-4 w-4 text-green-600" />
      <span className="font-medium">
        {label}: {price ? `€${price.toLocaleString()}` : 'Niet ingesteld'}
      </span>
    </div>
  );
};