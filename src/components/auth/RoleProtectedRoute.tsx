import React from "react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Navigate } from "react-router-dom";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredAccess: 'reports' | 'leads' | 'customers' | 'ai-agents' | 'settings' | 'taxatie';
  fallbackPath?: string;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  requiredAccess,
  fallbackPath = "/"
}) => {
  const roleAccess = useRoleAccess();

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
      default:
        return false;
    }
  };

  if (!hasAccess()) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};