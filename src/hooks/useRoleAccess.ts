import { useAuth } from "@/contexts/AuthContext";

export const useRoleAccess = () => {
  const { userRole, isAdmin } = useAuth();

  // Debug logging
  console.log('[useRoleAccess] Current userRole:', userRole, 'isAdmin:', isAdmin);

  const hasReportsAccess = () => {
    return isAdmin || userRole === 'manager';
  };

  const hasLeadsAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const hasCustomersAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const hasAIAgentsAccess = () => {
    return isAdmin; // Alleen admin en owner hebben toegang
  };

  const hasSettingsAccess = () => {
    return isAdmin;
  };

  const hasPriceAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const hasTaskManagementAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const hasTaxatieAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const canAssignTasks = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const isOperationalUser = () => {
    return userRole === 'user' || userRole === 'operationeel';
  };

  const hasCEOAccess = () => {
    return isAdmin; // isAdmin includes both 'admin' and 'owner' roles
  };

  return {
    hasReportsAccess,
    hasLeadsAccess,
    hasCustomersAccess,
    hasAIAgentsAccess,
    hasSettingsAccess,
    hasPriceAccess,
    hasTaskManagementAccess,
    hasTaxatieAccess,
    canAssignTasks,
    isOperationalUser,
    hasCEOAccess,
    userRole,
    isAdmin
  };
};