import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { filterHandelsvoorraad, isExternalVehicle, handelsvoorraadScope } from "./vehicleScope";

/* ---------- unit tests helper ---------- */

describe("vehicleScope helpers", () => {
  it("herkent externe werkplaats-auto's", () => {
    expect(isExternalVehicle({ status: "extern" })).toBe(true);
    expect(isExternalVehicle({ salesStatus: "extern" })).toBe(true);
    expect(isExternalVehicle({ status: "voorraad", details: { excludeFromStock: true } })).toBe(true);
    expect(isExternalVehicle({ status: "voorraad" })).toBe(false);
    expect(isExternalVehicle(null)).toBe(false);
  });

  it("filtert externe auto's uit een lijst", () => {
    const rows = [
      { id: "1", status: "voorraad" },
      { id: "2", status: "extern" },
      { id: "3", status: "verkocht_b2c" },
    ];
    expect(filterHandelsvoorraad(rows).map((r) => r.id)).toEqual(["1", "3"]);
    expect(filterHandelsvoorraad(null)).toEqual([]);
  });

  it("voegt .neq('status','extern') toe aan een querybuilder", () => {
    const calls: any[] = [];
    const fake = { neq: (...a: any[]) => (calls.push(a), fake) };
    handelsvoorraadScope(fake);
    expect(calls).toEqual([["status", "extern"]]);
  });
});

/* ---------- statische audit: geen enkele verkoop-query mag extern binnenlaten ---------- */

/** Bestanden/mappen waar externe werkplaats-auto's JUIST thuishoren. */
const WORKSHOP_ALLOWLIST = [
  "src/components/aftersales/",
  "src/components/werkplaats/",
  "src/pages/werkplaats/",
  "src/pages/garantie/",
  "src/components/reports/AftersalesDashboard.tsx",
  "src/hooks/useAftersalesNotifications.ts",
  "src/services/aftersalesService.ts",
  "src/services/customerWorkshopService.ts",
  "src/services/warrantyService.ts",
  "src/services/warrantyPackageService.ts",
  "src/services/workshopInvoiceService.ts",
  "src/services/rapportageService.ts",
  "src/services/directieService.ts",
  "src/contexts/BranchContext.tsx",
  "src/lib/vehicleScope.ts",
  "src/lib/vehicleScope.test.ts",
];

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });

const files = walk(path.join(process.cwd(), "src")).map((p) =>
  path.relative(process.cwd(), p).replace(/\\/g, "/"),
);

type Offender = { file: string; line: number };

const findOffenders = (): Offender[] => {
  const offenders: Offender[] = [];
  for (const file of files) {
    if (WORKSHOP_ALLOWLIST.some((a) => file.startsWith(a) || file === a)) continue;
    const src = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    for (const m of src.matchAll(/from\((['"])vehicles\1\)/g)) {
      const start = m.index ?? 0;
      const rest = src.slice(start, start + 1200);
      const end = rest.indexOf(";");
      const chunk = (end > 0 ? rest.slice(0, end) : rest.slice(0, 800)).replace(/\s+/g, " ");
      if (!chunk.includes(".select(")) continue; // writes zijn niet relevant
      if (/(eq|in)\((['"])(id|vehicle_id)\2/.test(chunk)) continue; // per-id lookups
      if (/extern/.test(chunk)) continue; // filter aanwezig
      offenders.push({ file, line: src.slice(0, start).split("\n").length });
    }
  }
  return offenders;
};

describe("handelsvoorraad-scope audit", () => {
  it("elke verkoop-/voorraad-query op vehicles sluit status 'extern' uit", () => {
    const offenders = findOffenders();
    expect(
      offenders.map((o) => `${o.file}:${o.line}`),
      "Voeg handelsvoorraadScope() of .neq('status','extern') toe, of zet het bestand op de werkplaats-allowlist",
    ).toEqual([]);
  });
});
