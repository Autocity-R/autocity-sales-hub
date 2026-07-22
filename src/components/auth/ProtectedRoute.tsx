
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useRoleAccess } from "@/hooks/useRoleAccess";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const { user, loading, isAdmin } = useAuth();
  const { isRestrictedWorkshopUser, getHomeRoute } = useRoleAccess();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Restricted werkplaats/uitdeuk/operationeel rollen: forceer hun eigen home-route
  if (isRestrictedWorkshopUser()) {
    const home = getHomeRoute();
    const allowed = location.pathname === home
      || location.pathname.startsWith('/werkplaats/mijn-planning')
      || location.pathname.startsWith('/uitdeuk')
      || location.pathname.startsWith('/werkplaats/overzicht')
      || location.pathname.startsWith('/operationeel');
    if (!allowed) {
      return <Navigate to={home} replace />;
    }
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Toegang geweigerd</h1>
          <p className="text-gray-600">Je hebt geen administrator rechten voor deze pagina.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
