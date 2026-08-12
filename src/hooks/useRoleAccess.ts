import { useAuth } from "@/contexts/AuthContext";
import { featureAccess } from "@/lib/routeAccess";

export const useRoleAccess = () => {
  const { userRole, isAdmin, roleLoading } = useAuth();

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
  const isAdministratie = () => userRole === 'administratie';

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
  // Read-only omgevingen: directie-cockpit én administratie (inzien + downloaden)
  const isDirectieReadOnly = () => isOperationeelDirecteur() || isAdministratie();

  // Mag werkorders goedkeuren / factureren (monteur nadrukkelijk NIET)
  const canApproveWorkOrders = () => canManageWorkOrders();
  const canInvoiceWorkOrders = () => canManageWorkOrders();

  // Zelfde bron als de route-guards, zodat menu en guard nooit uit elkaar lopen.
  const hasReportsAccess = () => isAdmin || featureAccess.reports(userRole);

  // Specifiek voor rapportages tab filtering - alleen Aftersales tab
  const hasAftersalesOnlyReportsAccess = () => {
    return userRole === 'aftersales_manager';
  };

  const hasLeadsAccess = () => isAdmin || featureAccess.leads(userRole);

  const hasCustomersAccess = () => isAdmin || featureAccess.customers(userRole);

  const hasAIAgentsAccess = () => isAdmin || featureAccess["ai-agents"](userRole);

  const hasSettingsAccess = () => {
    return isAdmin;
  };

  const hasPriceAccess = () => {
    // Aftersales manager mag GEEN prijzen zien
    // Operationeel directeur mag prijzen INZIEN (read-only, geen mutaties)
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' ||
      userRole === 'operationeel_directeur';
  };

  // Rapportages-omgeving (Omzet / Performance / KPI / Doorlooptijden)
  const hasRapportagesAccess = () => isAdmin || featureAccess.rapportages(userRole);

  const hasTaskManagementAccess = () => {
    // Aftersales manager MAG taken beheren
    return isAdmin || userRole === 'manager' || userRole === 'verkoper' ||
      userRole === 'aftersales_manager' || userRole === 'werkplaats_chef';
  };

  const hasTaxatieAccess = () => isAdmin || featureAccess.taxatie(userRole);

  // Transport-overzicht + binnenmelden (aangekomen)
  const hasTransportAccess = () => isAdmin || featureAccess.transport(userRole);

  // Alléén de BPM-vinkjes mogen door aftersales worden afgevinkt (geen bredere
  // voertuig-bewerkrechten: prijzen, status en verwijderen blijven ongewijzigd).
  const canEditBpmFlags = () =>
    isAdmin || userRole === 'manager' || userRole === 'verkoper' ||
    userRole === 'aftersales_manager';

  // Kenteken invullen/wijzigen: aftersales registreert het kenteken van importauto's.
  // Uitsluitend license_number — prijzen/status/verkoopvelden blijven ongewijzigd.
  const canEditKenteken = () => isAdmin || featureAccess.kenteken(userRole);

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
    hasRapportagesAccess,
    hasAftersalesOnlyReportsAccess,
    hasLeadsAccess,
    hasCustomersAccess,
    hasAIAgentsAccess,
    hasSettingsAccess,
    hasPriceAccess,
    hasTaskManagementAccess,
    hasTaxatieAccess,
    hasTransportAccess,
    canEditBpmFlags,
    canEditKenteken,
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
    isAdministratie,
    isDirectieReadOnly,
    isRestrictedWorkshopUser,
    getHomeRoute,
    hasWerkplaatsAccess,
    canManageWorkOrders,
    canApproveWorkOrders,
    canInvoiceWorkOrders,
    userRole,
    isAdmin,
    roleLoading,
  };
};
