
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { canAccessRoute } from "@/lib/routeAccess";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false
}) => {
  const { user, loading, isAdmin, userRole, roleLoading } = useAuth();
  const location = useLocation();

  if (loading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Eén centrale, geteste beslissing (owner/admin worden nooit geredirect).
  const decision = canAccessRoute(userRole, location.pathname);
  if (!decision.allowed && decision.redirectTo !== location.pathname) {
    return <Navigate to={decision.redirectTo} replace />;
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
