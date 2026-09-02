import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { featureAccess } from "@/lib/routeAccess";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredAccess: 'reports' | 'leads' | 'customers' | 'ai-agents' | 'settings' | 'taxatie' | 'rapportages' | 'poets-rapportage' | 'transport';
  fallbackPath?: string;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  requiredAccess,
  fallbackPath = "/"
}) => {
  const { userRole, isAdmin, roleLoading } = useAuth();

  // Belangrijk: de rol wordt asynchroon opgehaald ná de sessie. Zolang die niet
  // bekend is, mogen we NIET redirecten (dat veroorzaakte het direct terugvallen
  // naar het dashboard bij o.a. Rapportages).
  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400" />
      </div>
    );
  }

  // Owner/admin komen er altijd in. Is de rol (nog) onbekend — bijv. omdat de
  // user_roles-query faalde — dan NIET stil naar het dashboard redirecten.
  const check = featureAccess[requiredAccess];
  const hasAccess = isAdmin || (userRole ? !!check?.(userRole) : true);

  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};