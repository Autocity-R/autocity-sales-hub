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

const ADMINISTRATIE_MENU = [
  "/inventory", "/inventory/consumer", "/inventory/b2b", "/inventory/delivered",
  "/customers", "/werkplaats/facturen",
];

describe("administratie (plat, alleen-lezen menu)", () => {
  it.each(ADMINISTRATIE_MENU)("mag %s", (url) => {
    expect(canAccessRoute("administratie", url)).toEqual({ allowed: true });
  });

  it("mag klantendetail en leveranciers", () => {
    expect(canAccessRoute("administratie", "/suppliers")).toEqual({ allowed: true });
    expect(canAccessRoute("administratie", "/customers/123")).toEqual({ allowed: true });
    expect(featureAccess.customers("administratie")).toBe(true);
  });

  it("wordt elders naar /inventory gestuurd", () => {
    for (const url of ["/", "/leads", "/taxatie", "/settings", "/werkplaats", "/rapportages/omzet", "/ai-agents"]) {
      expect(canAccessRoute("administratie", url)).toEqual({ allowed: false, redirectTo: "/inventory" });
    }
  });

  it("heeft geen rapportages-, reports- of settings-toegang", () => {
    expect(featureAccess.rapportages("administratie")).toBe(false);
    expect(featureAccess.reports("administratie")).toBe(false);
    expect(featureAccess.settings("administratie")).toBe(false);
    expect(featureAccess.taxatie("administratie")).toBe(false);
  });

  it.each(ADMINISTRATIE_MENU)("%s is een geregistreerde route", (url) => {
    expect(routeExists(url)).toBe(true);
  });
});

describe("vakman-rollen houden hun eigen scherm", () => {
  it("krijgt geen transport-toegang", () => {
    for (const role of ["poetser", "schadeherstel", "uitdeuker_extern", "monteur"]) {
      expect(featureAccess.transport(role)).toBe(false);
    }
  });

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

describe("transport: binnenmelden bij aankomst", () => {
  it("aftersales_manager mag transport (menu + route)", () => {
    expect(featureAccess.transport("aftersales_manager")).toBe(true);
    expect(canAccessRoute("aftersales_manager", "/transport")).toEqual({ allowed: true });
    expect(routeExists("/transport")).toBe(true);
  });

  it("bestaande rollen behouden transport", () => {
    for (const role of ["owner", "admin", "manager", "verkoper", "operationeel", "user"]) {
      expect(featureAccess.transport(role)).toBe(true);
    }
  });

  it("administratie, directie en werkplaats_chef krijgen geen transport", () => {
    for (const role of ["administratie", "operationeel_directeur", "werkplaats_chef"]) {
      expect(featureAccess.transport(role)).toBe(false);
    }
    expect(canAccessRoute("administratie", "/transport")).toEqual({
      allowed: false, redirectTo: "/inventory",
    });
    expect(canAccessRoute("operationeel_directeur", "/transport")).toEqual({
      allowed: false, redirectTo: "/directie",
    });
  });
});

describe("verkoper mag inname doen, maar niet goedkeuren", () => {
  it.each(["/werkplaats/inname", "/werkplaats/inname/abc-123"])("mag %s", (url) => {
    expect(canAccessRoute("verkoper", url)).toEqual({ allowed: true });
  });

  it("wordt van goedkeuren weggestuurd naar inname", () => {
    expect(canAccessRoute("verkoper", "/werkplaats/goedkeuren")).toEqual({
      allowed: false,
      redirectTo: "/werkplaats/inname",
    });
  });

  it("heeft inname-feature wel, goedkeuren-feature niet", () => {
    expect(featureAccess.inname("verkoper")).toBe(true);
    expect(featureAccess.goedkeuren("verkoper")).toBe(false);
  });

  it("goedkeuren blijft voor aftersales/owner/admin/chef", () => {
    for (const r of ["owner", "admin", "aftersales_manager", "werkplaats_chef", "manager"]) {
      expect(featureAccess.goedkeuren(r)).toBe(true);
      expect(canAccessRoute(r, "/werkplaats/goedkeuren")).toEqual({ allowed: true });
    }
  });

  it("inname-routes zijn geregistreerd", () => {
    expect(routeExists("/werkplaats/inname")).toBe(true);
    expect(routeExists("/werkplaats/inname/abc")).toBe(true);
  });
});

describe("onbekende rol (nog niet geladen)", () => {
  it("veroorzaakt geen redirect", () => {
    expect(canAccessRoute(null, "/inventory")).toEqual({ allowed: true });
    expect(canAccessRoute(null, "/rapportages/omzet")).toEqual({ allowed: true });
  });
});

describe("prijschecker + handmatige facturen", () => {
  it("prijslijst is voor leiding, chef, aftersales en verkoper", () => {
    for (const r of ["owner", "admin", "manager", "aftersales_manager", "werkplaats_chef", "verkoper"]) {
      expect(featureAccess.prijslijst(r)).toBe(true);
    }
  });

  it("vakmannen en administratie krijgen geen prijschecker", () => {
    for (const r of ["monteur", "schadeherstel", "poetser", "uitdeuker_extern", "administratie", "operationeel_directeur"]) {
      expect(featureAccess.prijslijst(r)).toBe(false);
    }
  });

  it("vakmannen en administratie worden weggeleid van de prijslijst-route", () => {
    for (const r of ["monteur", "schadeherstel", "poetser", "uitdeuker_extern", "administratie", "operationeel_directeur"]) {
      expect(canAccessRoute(r, "/werkplaats/prijslijst").allowed).toBe(false);
    }
  });

  it("verkoper en chef mogen de prijslijst-route openen", () => {
    for (const r of ["owner", "admin", "manager", "verkoper", "aftersales_manager", "werkplaats_chef"]) {
      expect(canAccessRoute(r, "/werkplaats/prijslijst")).toEqual({ allowed: true });
    }
  });

  it("handmatige facturen alleen voor owner/admin/aftersales_manager", () => {
    for (const r of ["owner", "admin", "aftersales_manager"]) {
      expect(featureAccess["handmatige-facturen"](r)).toBe(true);
    }
    for (const r of ["manager", "verkoper", "werkplaats_chef", "monteur", "administratie"]) {
      expect(featureAccess["handmatige-facturen"](r)).toBe(false);
    }
  });
});
