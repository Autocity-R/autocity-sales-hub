import { useAuth } from "@/contexts/AuthContext";

export const useRoleAccess = () => {
  const { userRole, isAdmin } = useAuth();

  // Debug logging
  console.log('[useRoleAccess] Current userRole:', userRole, 'isAdmin:', isAdmin);

  // Aftersales Manager specifieke check
  const isAftersalesManager = () => {
    return userRole === 'aftersales_manager';
  };

  // Werkplaats/operationeel rollen
  const isSchadeherstel = () => userRole === 'schadeherstel';
  const isPoetser = () => userRole === 'poetser';
  const isMonteur = () => userRole === 'monteur';
  const isWerkplaatsChef = () => userRole === 'werkplaats_chef';
  const isUitdeukerExtern = () => userRole === 'uitdeuker_extern';
  const isOperationeelDirecteur = () => userRole === 'operationeel_directeur';

  // Gebruikers met een "gesloten" werkplaats-omgeving (geen normale CRM menu's)
  // Werkplaats_chef heeft de VOLLEDIGE operationele omgeving en is dus niet "restricted".
  const isRestrictedWorkshopUser = () => (
    isSchadeherstel() || isMonteur() ||
    isUitdeukerExtern() || isOperationeelDirecteur() || isPoetser()
  );

  // Startroute per rol (voor auto-redirect vanuit "/")
  const getHomeRoute = (): string => {
    if (isMonteur()) return '/werkplaats/mijn-werk';
    if (isSchadeherstel()) return '/werkplaats/schadeherstel';
    if (isUitdeukerExtern()) return '/werkplaats/uitdeuken';
    if (isPoetser()) return '/werkplaats/poetsen';
    if (isWerkplaatsChef()) return '/werkplaats';
    if (isOperationeelDirecteur()) return '/directie';
    if (isAftersalesManager()) return '/werkplaats';
    return '/';
  };

  // Toegang tot het nieuwe WERKPLAATS menu-blok (aftersales pilaar)
  const hasWerkplaatsAccess = () => {
    // Per-dashboard uitrol: WERKPLAATS-menu is zichtbaar voor aftersales_manager en werkplaats_chef.
    // Owner/admin behouden data-toegang via RLS, maar zien het menu (nog) niet.
    return userRole === 'aftersales_manager' || userRole === 'werkplaats_chef';
  };

  // Mag operationele werkorders beheren (aanmaken, toewijzen, verzetten, verwijderen)
  const canManageWorkOrders = () => (
    isAdmin || userRole === 'manager' || userRole === 'aftersales_manager' ||
    userRole === 'werkplaats_chef'
  );

  // Directie-cockpit: overal inzicht, nergens mutaties
  const isDirectieReadOnly = () => isOperationeelDirecteur();

  // Mag werkorders goedkeuren / factureren (monteur nadrukkelijk NIET)
  const canApproveWorkOrders = () => canManageWorkOrders();
  const canInvoiceWorkOrders = () => canManageWorkOrders();

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
    // Werkplaats_chef mag klanten wél inzien (read-only, geen verkoopflows)
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' ||
      userRole === 'werkplaats_chef' || userRole === 'operationeel_directeur';
  };

  const hasAIAgentsAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' || userRole === 'operationeel' || userRole === 'aftersales_manager';
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
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' ||
      userRole === 'aftersales_manager' || userRole === 'werkplaats_chef';
  };

  const hasTaxatieAccess = () => {
    // Aftersales manager mag GEEN taxaties doen
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  const canAssignTasks = () => {
    // Aftersales manager MAG taken toewijzen
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' ||
      userRole === 'aftersales_manager' || userRole === 'werkplaats_chef';
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
           userRole === 'user' || userRole === 'operationeel' ||
           userRole === 'aftersales_manager' || userRole === 'werkplaats_chef';
  };

  // Nieuwe functie: Aftersales manager mag GEEN voertuigen bewerken
  const canEditVehicles = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper';
  };

  // Garantie-CLAIMS (overzicht + detail): werkplaats_chef mag hier wél bij
  const hasGarantieAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' ||
      userRole === 'aftersales_manager' || userRole === 'werkplaats_chef' ||
      userRole === 'operationeel_directeur';
  };

  // Garantie-INBOX / e-mails: aftersales-werk, NIET voor de werkplaats_chef
  const hasGarantieInboxAccess = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' ||
      userRole === 'aftersales_manager';
  };

  // Claimbeheer (aanmaken, afwikkelen, verwijderen, klantmails): niet voor de chef
  const canManageWarrantyClaims = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' ||
      userRole === 'aftersales_manager';
  };

  // Aftersales manager MAG checklisten volledig bewerken (items toevoegen, afvinken, taken toewijzen)
  const canManageChecklists = () => {
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' ||
      userRole === 'aftersales_manager' || userRole === 'werkplaats_chef';
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
    hasGarantieInboxAccess,
    canManageWarrantyClaims,
    isAftersalesManager,
    canManageChecklists,
    isSchadeherstel,
    isPoetser,
    isMonteur,
    isWerkplaatsChef,
    isUitdeukerExtern,
    isOperationeelDirecteur,
    isDirectieReadOnly,
    isRestrictedWorkshopUser,
    getHomeRoute,
    hasWerkplaatsAccess,
    canManageWorkOrders,
    canApproveWorkOrders,
    canInvoiceWorkOrders,
    userRole,
    isAdmin
  };
};
