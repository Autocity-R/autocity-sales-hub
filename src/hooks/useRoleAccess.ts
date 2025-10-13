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

  const hasAnalyticsAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'owner';
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
    return userRole === 'operationeel';
  };

  const hasInventoryEditAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const hasTransportAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const hasWarrantyAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' || userRole === 'operationeel';
  };

  const hasLoanCarsAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const hasCalendarAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const canViewAllInventory = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const canViewSoldInventoryOnly = () => {
    return userRole === 'operationeel';
  };

  return {
    hasReportsAccess,
    hasLeadsAccess,
    hasCustomersAccess,
    hasAIAgentsAccess,
    hasSettingsAccess,
    hasAnalyticsAccess,
    hasPriceAccess,
    hasTaskManagementAccess,
    canAssignTasks,
    isOperationalUser,
    hasInventoryEditAccess,
    hasTransportAccess,
    hasWarrantyAccess,
    hasLoanCarsAccess,
    hasCalendarAccess,
    canViewAllInventory,
    canViewSoldInventoryOnly,
    userRole,
    isAdmin
  };
};