import React from "react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Navigate } from "react-router-dom";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredAccess: 'reports' | 'leads' | 'customers' | 'ai-agents' | 'settings' | 'taxatie' | 'rapportages';
  fallbackPath?: string;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  requiredAccess,
  fallbackPath = "/"
}) => {
  const roleAccess = useRoleAccess();

  // Belangrijk: de rol wordt asynchroon opgehaald ná de sessie. Zolang die niet
  // bekend is, mogen we NIET redirecten (dat veroorzaakte het direct terugvallen
  // naar het dashboard bij o.a. Rapportages).
  if (roleAccess.roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400" />
      </div>
    );
  }

  const hasAccess = () => {
    switch (requiredAccess) {
      case 'reports':
        return roleAccess.hasReportsAccess();
      case 'leads':
        return roleAccess.hasLeadsAccess();
      case 'customers':
        return roleAccess.hasCustomersAccess();
      case 'ai-agents':
        return roleAccess.hasAIAgentsAccess();
      case 'settings':
        return roleAccess.hasSettingsAccess();
      case 'taxatie':
        return roleAccess.hasTaxatieAccess();
      case 'rapportages':
        return roleAccess.hasRapportagesAccess();
      default:
        return false;
    }
  };

  if (!hasAccess()) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};