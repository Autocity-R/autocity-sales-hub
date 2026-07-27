
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
  const { isRestrictedWorkshopUser, getHomeRoute, isWerkplaatsChef, isUitdeukerExtern, isSchadeherstel, isPoetser, isOperationeelDirecteur } = useRoleAccess();
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

  // Externe uitdeuker: uitsluitend zijn eigen scherm
  if (isUitdeukerExtern()) {
    if (location.pathname !== '/werkplaats/uitdeuken') {
      return <Navigate to="/werkplaats/uitdeuken" replace />;
    }
    return <>{children}</>;
  }

  // Schadeherstel: uitsluitend zijn eigen scherm
  if (isSchadeherstel()) {
    if (location.pathname !== '/werkplaats/schadeherstel') {
      return <Navigate to="/werkplaats/schadeherstel" replace />;
    }
    return <>{children}</>;
  }

  // Operationeel directeur: read-only cockpit met een vaste set inzicht-routes
  if (isOperationeelDirecteur()) {
    const directieAllowed = [
      '/directie',
      '/werkplaats/planning',
      '/werkplaats/agenda',
      '/werkplaats/facturen',
      '/werkplaats/inname',
      '/werkplaats/poetsen',
      '/werkplaats/uitdeuken',
      '/werkplaats/schadeherstel',
      '/werkplaats/onderdelen',
      '/werkplaats/autos',
      '/warranty',
      '/customers',
      '/inventory/consumer',
      '/inventory/b2c',
    ];
    if (!directieAllowed.some(pre => location.pathname.startsWith(pre))) {
      return <Navigate to="/directie" replace />;
    }
    return <>{children}</>;
  }

  // Restricted werkplaats/uitdeuk/operationeel rollen: forceer hun eigen home-route
  // Poetser: uitsluitend zijn eigen scherm
  if (isPoetser()) {
    if (location.pathname !== '/werkplaats/poetsen') {
      return <Navigate to="/werkplaats/poetsen" replace />;
    }
    return <>{children}</>;
  }

  if (isRestrictedWorkshopUser()) {
    const home = getHomeRoute();
    const allowed = location.pathname === home
      || location.pathname.startsWith('/werkplaats/mijn-werk')
      || location.pathname.startsWith('/werkplaats/agenda')
      || location.pathname.startsWith('/werkplaats/mijn-planning')
      || location.pathname.startsWith('/uitdeuk')
      || location.pathname.startsWith('/werkplaats/overzicht')
      || location.pathname.startsWith('/operationeel');
    if (!allowed) {
      return <Navigate to={home} replace />;
    }
  }

  // Werkplaats_chef: operationele omgeving, géén verkoop-onderdelen en géén garantie-mailbox
  if (isWerkplaatsChef()) {
    const blockedChefPrefixes = ['/werkplaats/poetsen', '/werkplaats/uitdeuken', '/garantie'];
    const allowedChefPrefixes = [
      '/werkplaats', '/loan-cars', '/settings', '/inventory/consumer', '/warranty', '/customers',
    ];
    const ok =
      !blockedChefPrefixes.some(pre => location.pathname.startsWith(pre)) &&
      allowedChefPrefixes.some(pre => location.pathname.startsWith(pre));
    if (!ok) {
      return <Navigate to="/werkplaats" replace />;
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
