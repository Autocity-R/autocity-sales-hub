/**
 * Centrale, pure route-toegangslogica.
 *
 * Reden van bestaan: de rol-guards zaten verspreid in ProtectedRoute /
 * RoleProtectedRoute, waardoor owner/admin per ongeluk mee-matchte op
 * rol-specifieke allowlists en naar het dashboard werd gestuurd.
 * Alles hier is puur (rol + pad → besluit) zodat het te unit-testen is.
 */

export type Role = string | null;

/** Rollen met volledige CRM-toegang: nooit redirecten op basis van rol. */
export const FULL_ACCESS_ROLES = [
  "owner",
  "admin",
  "manager",
  "verkoper",
  "operationeel",
  "user",
  "aftersales_manager",
] as const;

export const hasFullAccess = (role: Role): boolean =>
  !!role && (FULL_ACCESS_ROLES as readonly string[]).includes(role);

/** Rollen met een gesloten, eigen omgeving. */
export const CLOSED_ROLE_ROUTES: Record<string, string> = {
  uitdeuker_extern: "/werkplaats/uitdeuken",
  schadeherstel: "/werkplaats/schadeherstel",
  poetser: "/werkplaats/poetsen",
};

/** Read-only inzicht-routes voor de operationeel directeur. */
export const DIRECTIE_ALLOWED_PREFIXES = [
  "/directie",
  "/rapportages",
  "/werkplaats/planning",
  "/werkplaats/agenda",
  "/werkplaats/facturen",
  "/werkplaats/inname",
  "/werkplaats/klanten",
  "/werkplaats/poetsen",
  "/werkplaats/uitdeuken",
  "/werkplaats/onderdelen",
  "/werkplaats/autos",
  "/warranty",
  "/customers",
  "/inventory",
];

/** Monteur: eigen werk + agenda. */
export const MONTEUR_ALLOWED_PREFIXES = [
  "/werkplaats/mijn-werk",
  "/werkplaats/mijn-planning",
  "/werkplaats/agenda",
  "/werkplaats/overzicht",
  "/uitdeuk",
  "/operationeel",
];

export const WERKPLAATS_CHEF_BLOCKED_PREFIXES = [
  "/werkplaats/poetsen",
  "/werkplaats/uitdeuken",
  "/garantie",
];

export const WERKPLAATS_CHEF_ALLOWED_PREFIXES = [
  "/werkplaats",
  "/loan-cars",
  "/settings",
  "/inventory/consumer",
  "/warranty",
  "/customers",
];

/** Administratie: plat, alleen-lezen inzicht in voorraad, klanten en facturen. */
export const ADMINISTRATIE_ALLOWED_PREFIXES = [
  "/inventory",
  "/customers",
  "/suppliers",
  "/werkplaats/facturen",
];

/**
 * Verkoper: mag de inname-flow gebruiken, maar het GOEDKEUREN van werk
 * (na schadeherstel/werkplaats) blijft aftersales-werk.
 */
export const VERKOPER_BLOCKED_PREFIXES = ["/werkplaats/goedkeuren"];

/** Inname-routes (lijst + detail/foto-flow). */
export const INNAME_PREFIXES = ["/werkplaats/inname"];

export const getHomeRouteForRole = (role: Role): string => {
  if (role && CLOSED_ROLE_ROUTES[role]) return CLOSED_ROLE_ROUTES[role];
  if (role === "monteur") return "/werkplaats/mijn-werk";
  if (role === "werkplaats_chef") return "/werkplaats";
  if (role === "operationeel_directeur") return "/directie";
  if (role === "aftersales_manager") return "/werkplaats";
  if (role === "administratie") return "/inventory";
  return "/";
};

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p));

export type RouteDecision = { allowed: true } | { allowed: false; redirectTo: string };

/**
 * Bepaalt of een rol een pad mag openen. Onbekende/nog niet geladen rol (null)
 * wordt NOOIT geredirect — de aanroeper wacht op roleLoading.
 */
export const canAccessRoute = (role: Role, pathname: string): RouteDecision => {
  if (role === "verkoper" && startsWithAny(pathname, VERKOPER_BLOCKED_PREFIXES)) {
    return { allowed: false, redirectTo: "/werkplaats/inname" };
  }

  if (!role || hasFullAccess(role)) return { allowed: true };

  const closed = CLOSED_ROLE_ROUTES[role];
  if (closed) {
    return pathname === closed ? { allowed: true } : { allowed: false, redirectTo: closed };
  }

  if (role === "operationeel_directeur") {
    return startsWithAny(pathname, DIRECTIE_ALLOWED_PREFIXES)
      ? { allowed: true }
      : { allowed: false, redirectTo: "/directie" };
  }

  if (role === "monteur") {
    return startsWithAny(pathname, MONTEUR_ALLOWED_PREFIXES)
      ? { allowed: true }
      : { allowed: false, redirectTo: "/werkplaats/mijn-werk" };
  }

  if (role === "werkplaats_chef") {
    const blocked = startsWithAny(pathname, WERKPLAATS_CHEF_BLOCKED_PREFIXES);
    const allowed = startsWithAny(pathname, WERKPLAATS_CHEF_ALLOWED_PREFIXES);
    return !blocked && allowed ? { allowed: true } : { allowed: false, redirectTo: "/werkplaats" };
  }

  if (role === "administratie") {
    return startsWithAny(pathname, ADMINISTRATIE_ALLOWED_PREFIXES)
      ? { allowed: true }
      : { allowed: false, redirectTo: "/inventory" };
  }

  // Overige/onbekende rollen: geen rol-redirect (RLS bepaalt de data).
  return { allowed: true };
};

/* ============ Feature-toegang (gebruikt door RoleProtectedRoute) ============ */

const isAdminRole = (role: Role) => role === "admin" || role === "owner";

export const featureAccess: Record<string, (role: Role) => boolean> = {
  reports: (r) => isAdminRole(r) || r === "manager" || r === "aftersales_manager",
  leads: (r) => isAdminRole(r) || r === "manager" || r === "verkoper",
  customers: (r) =>
    isAdminRole(r) || r === "manager" || r === "verkoper" || r === "werkplaats_chef" ||
    r === "operationeel_directeur" || r === "administratie",
  "ai-agents": (r) =>
    isAdminRole(r) || r === "manager" || r === "verkoper" || r === "operationeel" ||
    r === "aftersales_manager",
  settings: (r) => isAdminRole(r),
  taxatie: (r) => isAdminRole(r) || r === "manager" || r === "verkoper",
  rapportages: (r) => isAdminRole(r) || r === "manager" || r === "operationeel_directeur",
  /** Inname doen: aftersales + werkplaats + verkoop. */
  inname: (r) =>
    isAdminRole(r) || r === "manager" || r === "operationeel" || r === "verkoper" ||
    r === "aftersales_manager" || r === "werkplaats_chef",
  /** Werk goedkeuren (start interne facturatie): nooit de verkoper. */
  goedkeuren: (r) =>
    isAdminRole(r) || r === "manager" || r === "aftersales_manager" || r === "werkplaats_chef",
  /** Prijschecker (normuren + arbeidsprijzen): balie/verkoop + leiding, geen vakmannen. */
  prijslijst: (r) =>
    isAdminRole(r) || r === "manager" || r === "aftersales_manager" || r === "werkplaats_chef" ||
    r === "verkoper",
  /** Handmatige facturen opmaken. */
  "handmatige-facturen": (r) => isAdminRole(r) || r === "aftersales_manager",
  /**
   * Transport-overzicht + binnenmelden (aangekomen). Aftersales doet de inname bij
   * aankomst en mag daarom ook binnenmelden. Vakmanrollen, administratie en de
   * operationeel directeur krijgen hier géén toegang.
   */
  transport: (r) =>
    isAdminRole(r) || r === "manager" || r === "verkoper" || r === "operationeel" ||
    r === "user" || r === "aftersales_manager",
};
