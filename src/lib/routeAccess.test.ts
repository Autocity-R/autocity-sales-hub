import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canAccessRoute, featureAccess } from "./routeAccess";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

/** Alle in de router geregistreerde paden. */
const routes = Array.from(read("src/App.tsx").matchAll(/<Route\s+path="([^"]+)"/g)).map(
  (m) => m[1],
);

const routeExists = (url: string) =>
  routes.some((r) => {
    if (r === url) return true;
    // dynamische segmenten (/customers/:id) vergelijken op segment-aantal
    if (!r.includes(":")) return false;
    const rp = r.split("/");
    const up = url.split("/");
    return rp.length === up.length && rp.every((seg, i) => seg.startsWith(":") || seg === up[i]);
  });

/** Menu-items zoals ze in de sidebar staan (per sectie). */
const SIDEBAR: Record<string, string[]> = {
  DASHBOARD: ["/"],
  VERKOOP: [
    "/leads", "/calendar", "/customers", "/customers/b2b", "/customers/b2c", "/suppliers",
    "/inventory", "/inventory/online", "/inventory/b2b", "/inventory/consumer",
    "/inventory/delivered", "/transport", "/tasks", "/taxatie", "/foto-studio",
  ],
  OPERATIONEEL: [
    "/werkplaats", "/werkplaats/planning", "/werkplaats/inname", "/werkplaats/agenda",
    "/werkplaats/goedkeuren", "/werkplaats/onderdelen", "/werkplaats/poetsen",
    "/werkplaats/uitdeuken", "/werkplaats/autos", "/werkplaats/facturen",
  ],
  GARANTIE: ["/garantie/inbox", "/warranty", "/loan-cars"],
  RAPPORTAGES: [
    "/rapportages/omzet", "/rapportages/performance", "/rapportages/kpi",
    "/rapportages/doorlooptijden",
  ],
  BEHEER: ["/ai-agents", "/reports", "/settings"],
};

const DIRECTIE_MENU = [
  "/directie", "/rapportages/omzet", "/inventory", "/inventory/consumer",
  "/werkplaats/planning", "/werkplaats/agenda", "/werkplaats/facturen", "/warranty",
  "/werkplaats/inname", "/werkplaats/poetsen", "/werkplaats/uitdeuken",
  "/werkplaats/onderdelen", "/customers",
];

const allMenuPaths = [...Object.values(SIDEBAR).flat(), ...DIRECTIE_MENU];

describe("sidebar → router", () => {
  it.each(allMenuPaths)("%s is een geregistreerde route", (url) => {
    expect(routeExists(url)).toBe(true);
  });
});

describe("owner/admin worden nergens geredirect", () => {
  for (const role of ["owner", "admin"]) {
    it.each(allMenuPaths)(`${role} mag %s`, (url) => {
      expect(canAccessRoute(role, url)).toEqual({ allowed: true });
    });
  }

  it("owner heeft rapportages- en reports-toegang", () => {
    expect(featureAccess.rapportages("owner")).toBe(true);
    expect(featureAccess.rapportages("admin")).toBe(true);
    expect(featureAccess.reports("owner")).toBe(true);
    expect(featureAccess.settings("owner")).toBe(true);
  });
});

describe("operationeel_directeur (read-only cockpit)", () => {
  it.each(DIRECTIE_MENU)("mag %s", (url) => {
    expect(canAccessRoute("operationeel_directeur", url)).toEqual({ allowed: true });
  });

  it("mag alle vier rapportages", () => {
    for (const url of SIDEBAR.RAPPORTAGES) {
      expect(canAccessRoute("operationeel_directeur", url)).toEqual({ allowed: true });
      expect(featureAccess.rapportages("operationeel_directeur")).toBe(true);
    }
  });

  it("wordt van verkoopflows naar /directie gestuurd", () => {
    for (const url of ["/leads", "/taxatie", "/settings", "/foto-studio"]) {
      expect(canAccessRoute("operationeel_directeur", url)).toEqual({
        allowed: false,
        redirectTo: "/directie",
      });
    }
  });
});

describe("vakman-rollen houden hun eigen scherm", () => {
  const cases: [string, string][] = [
    ["poetser", "/werkplaats/poetsen"],
    ["schadeherstel", "/werkplaats/schadeherstel"],
    ["uitdeuker_extern", "/werkplaats/uitdeuken"],
    ["monteur", "/werkplaats/mijn-werk"],
  ];
  it.each(cases)("%s → %s", (role, home) => {
    expect(canAccessRoute(role, home)).toEqual({ allowed: true });
    expect(canAccessRoute(role, "/inventory")).toEqual({ allowed: false, redirectTo: home });
  });
});

describe("werkplaats_chef", () => {
  it("mag operationeel, geen rapportages/verkoop", () => {
    expect(canAccessRoute("werkplaats_chef", "/werkplaats/planning")).toEqual({ allowed: true });
    expect(canAccessRoute("werkplaats_chef", "/inventory/consumer")).toEqual({ allowed: true });
    expect(canAccessRoute("werkplaats_chef", "/rapportages/omzet")).toEqual({
      allowed: false, redirectTo: "/werkplaats",
    });
    expect(featureAccess.rapportages("werkplaats_chef")).toBe(false);
  });
});

describe("onbekende rol (nog niet geladen)", () => {
  it("veroorzaakt geen redirect", () => {
    expect(canAccessRoute(null, "/inventory")).toEqual({ allowed: true });
    expect(canAccessRoute(null, "/rapportages/omzet")).toEqual({ allowed: true });
  });
});
