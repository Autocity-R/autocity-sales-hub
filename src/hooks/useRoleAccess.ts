import { useAuth } from "@/contexts/AuthContext";

export const useRoleAccess = () => {
  const { userRole, isAdmin } = useAuth();

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
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
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

  const canAssignTasks = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const isOperationalUser = () => {
    return userRole === 'user' || userRole === 'operationeel';
  };

  return {
    hasReportsAccess,
    hasLeadsAccess,
    hasCustomersAccess,
    hasAIAgentsAccess,
    hasSettingsAccess,
    hasPriceAccess,
    hasTaskManagementAccess,
    canAssignTasks,
    isOperationalUser,
    userRole,
    isAdmin
  };
};