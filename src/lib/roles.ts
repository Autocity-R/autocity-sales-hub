export const APP_ROLES = [
  "monteur",
  "uitdeuker_extern",
  "schadeherstel",
  "poetser",
  "werkplaats_chef",
  "verkoper",
  "aftersales_manager",
  "operationeel",
  "operationeel_directeur",
  "administratie",
  "manager",
  "admin",
  "owner",
  "user",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_OPTIONS: { value: AppRole; label: string; description: string }[] = [
  { value: "monteur", label: "Monteur", description: "Voert werkplaats-orders uit" },
  { value: "uitdeuker_extern", label: "Uitdeuker", description: "Voert uitdeuk-orders uit" },
  { value: "schadeherstel", label: "Schadeherstel", description: "Voert schadeherstel-werkorders uit" },
  { value: "poetser", label: "Poetser", description: "Voert poets-werkorders uit" },
  { value: "werkplaats_chef", label: "Werkplaats Chef", description: "Overzicht werkplaats, taken toewijzen en goedkeuren" },
  { value: "verkoper", label: "Verkoper", description: "Kan leads en verkopen beheren" },
  { value: "aftersales_manager", label: "Aftersales Manager", description: "Beheert leveringen, garantie en taken" },
  { value: "operationeel", label: "Operationeel", description: "Operationele taken uitvoeren" },
  { value: "operationeel_directeur", label: "Operationeel Directeur", description: "Directie-inzicht (alleen-lezen cockpit en rapportages)" },
  { value: "administratie", label: "Administratie", description: "Voorraad, verkopen, klanten en facturen inzien" },
  { value: "manager", label: "Manager", description: "Kan teams en rapportages beheren" },
  { value: "admin", label: "Admin", description: "Volledige toegang tot alle functies" },
  { value: "owner", label: "Owner", description: "Eigenaar met alle rechten" },
  { value: "user", label: "Gebruiker", description: "Basis toegang tot het systeem" },
];

export const ROLE_LABELS: Record<string, string> = ROLE_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<string, string>
);

export const getRoleLabel = (role?: string | null): string =>
  (role && ROLE_LABELS[role]) || "Gebruiker";
