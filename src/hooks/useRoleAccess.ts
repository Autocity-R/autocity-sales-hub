import { useAuth } from "@/contexts/AuthContext";

export const useRoleAccess = () => {
  const { userRole, isAdmin } = useAuth();

  // Debug logging
  console.log('[useRoleAccess] Current userRole:', userRole, 'isAdmin:', isAdmin);

  // Aftersales Manager specifieke check
  const isAftersalesManager = () => {
    return userRole === 'aftersales_manager';
  };

  const hasReportsAccess = () => {
    // Aftersales manager mag naar rapportages (alleen Aftersales tab)
    return isAdmin || userRole === 'manager' || userRole === 'aftersales_manager';
  };

  // Specifiek voor rapportages tab filtering - alleen Aftersales tab
  const hasAftersalesOnlyReportsAccess = () => {
    return userRole === 'aftersales_manager';
  };

  const hasLeadsAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const hasCustomersAccess = () => {
    // Aftersales manager mag GEEN klanten beheren
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const hasAIAgentsAccess = () => {
    return isAdmin; // Alleen admin en owner hebben toegang
  };

  const hasSettingsAccess = () => {
    return isAdmin;
  };

  const hasPriceAccess = () => {
    // Aftersales manager mag GEEN prijzen zien
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const hasTaskManagementAccess = () => {
    // Aftersales manager MAG taken beheren
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' || userRole === 'aftersales_manager';
  };

  const hasTaxatieAccess = () => {
    // Aftersales manager mag GEEN taxaties doen
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const canAssignTasks = () => {
    // Aftersales manager MAG taken toewijzen
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' || userRole === 'aftersales_manager';
  };

  const isOperationalUser = () => {
    return userRole === 'user' || userRole === 'operationeel';
  };

  const hasCEOAccess = () => {
    return isAdmin; // isAdmin includes both 'admin' and 'owner' roles
  };

  const canChecklistToggle = () => {
    // Aftersales manager MAG checklist items afvinken
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' || 
           userRole === 'user' || userRole === 'operationeel' || userRole === 'aftersales_manager';
  };

  // Nieuwe functie: Aftersales manager mag GEEN voertuigen bewerken
  const canEditVehicles = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  // Aftersales manager MAG garantie claims beheren
  const hasGarantieAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' || userRole === 'aftersales_manager';
  };

  return {
    hasReportsAccess,
    hasAftersalesOnlyReportsAccess,
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
    canChecklistToggle,
    canEditVehicles,
    hasGarantieAccess,
    isAftersalesManager,
    userRole,
    isAdmin
  };
};
