import { describe, it, expect } from "vitest";
import {
  factuurVensterBijGoedkeuren, internInvoiceDraft, valideerInternKeuze, regelsVoorRpc, geenKostenReden,
  interneOrdersZonderFactuur, INTERNE_KLANT,
} from "./interneFactuur";

const order = (extra: Record<string, unknown> = {}) => ({
  id: "o1", discipline: "werkplaats", source: "aftersales", origin: "intern", external_customer: null,
  branch: "rotterdam", description: "Remmen vervangen", ...extra,
});

describe("factuurVensterBijGoedkeuren", () => {
  it("vlag uit: nooit (alles zoals nu)", () => {
    expect(factuurVensterBijGoedkeuren(order(), false)).toBe(false);
  });
  it("vlag aan: garantie, aftersales en handmatig verplicht via het venster", () => {
    expect(factuurVensterBijGoedkeuren(order({ source: "garantie" }), true)).toBe(true);
    expect(factuurVensterBijGoedkeuren(order({ source: "aftersales" }), true)).toBe(true);
    expect(factuurVensterBijGoedkeuren(order({ source: null }), true)).toBe(true);
  });
  it("rijklaar (checklist) factureert automatisch: geen venster", () => {
    expect(factuurVensterBijGoedkeuren(order({ source: "checklist" }), true)).toBe(false);
  });
  it("spuit en externe klussen blijven buiten deze regel", () => {
    expect(factuurVensterBijGoedkeuren(order({ discipline: "spuit" }), true)).toBe(false);
    expect(factuurVensterBijGoedkeuren(order({ origin: "extern" }), true)).toBe(false);
    expect(factuurVensterBijGoedkeuren(order({ external_customer: { name: "X" } }), true)).toBe(false);
  });
});

describe("internInvoiceDraft", () => {
  it("klant Autocity, omschrijving als eerste regel met bedrag leeg", () => {
    const d = internInvoiceDraft(order());
    expect(d.customer.name).toBe("Autocity Automotive Group B.V.");
    expect(d.customer).toEqual(INTERNE_KLANT);
    expect(d.work_order_id).toBe("o1");
    expect(d.lines).toEqual([{ description: "Remmen vervangen", amount: 0 }]);
  });
  it("garantie krijgt 'Garantie GC-…' in de omschrijving", () => {
    const d = internInvoiceDraft(order({ source: "garantie", claim_nummer: "GC-2026-0188" }));
    expect(d.lines[0].description).toBe("Garantie GC-2026-0188 — Remmen vervangen");
  });
});

describe("valideerInternKeuze", () => {
  it("bedrag moet groter dan € 0 zijn", () => {
    expect(valideerInternKeuze({ soort: "factuur", regels: [{ description: "Remmen", amount: 0 }] })).not.toBeNull();
    expect(valideerInternKeuze({ soort: "factuur", regels: [{ description: "Remmen", amount: 150 }] })).toBeNull();
  });
  it("Geen kosten alleen met een reden", () => {
    expect(valideerInternKeuze({ soort: "geen_kosten", reden: "  " })).not.toBeNull();
    expect(valideerInternKeuze({ soort: "geen_kosten", reden: "Coulance" })).toBeNull();
  });
  it("negatieve bedragen mogen niet", () => {
    expect(valideerInternKeuze({ soort: "factuur", regels: [{ description: "A", amount: 200 }, { description: "B", amount: -50 }] })).not.toBeNull();
  });
});

describe("regelsVoorRpc / geenKostenReden", () => {
  it("lege regels vallen weg, onderdelen worden gemarkeerd", () => {
    expect(regelsVoorRpc([
      { description: "Arbeid", amount: 150 }, { description: "", amount: 0 }, { description: "Remblokken", amount: 49.499, soort: "onderdelen" },
    ])).toEqual([{ description: "Arbeid", amount: 150 }, { description: "Remblokken", amount: 49.5, soort: "onderdelen" }]);
  });
  it("reden met toelichting; 'Anders' vraagt een toelichting", () => {
    expect(geenKostenReden("Coulance", "klant tevreden")).toBe("Coulance: klant tevreden");
    expect(geenKostenReden("Eigen fout", "")).toBe("Eigen fout");
    expect(geenKostenReden("Anders", "")).toBe("");
  });
});

describe("interneOrdersZonderFactuur (vangnet)", () => {
  const vanaf = "2026-11-16T16:07:28Z";
  const o = (id: string, approved: string, extra: Record<string, unknown> = {}) =>
    ({ ...order({ id }), status: "goedgekeurd", approved_at: approved, factuur_niet_nodig: false, ...extra });
  it("alleen goedgekeurd na de livegang, zonder factuur en zonder 'geen factuur nodig'", () => {
    const lijst = [
      o("voor", "2026-11-10T10:00:00Z"),
      o("na", "2026-11-17T10:00:00Z"),
      o("gefactureerd", "2026-11-17T10:00:00Z"),
      o("nietnodig", "2026-11-17T10:00:00Z", { factuur_niet_nodig: true }),
      o("spuit", "2026-11-17T10:00:00Z", { discipline: "spuit" }),
      o("afgerond", "2026-11-17T10:00:00Z", { status: "afgerond" }),
    ];
    expect(interneOrdersZonderFactuur(lijst, new Set(["gefactureerd"]), vanaf).map(x => x.id)).toEqual(["na"]);
  });
});
