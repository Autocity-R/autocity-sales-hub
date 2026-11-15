import { describe, it, expect } from "vitest";
import {
  creditInfo, creditBedragen, crediteerbaar, creditBadge, betaalLabel, creditDocumentTekst, parseBedrag, mayCrediteer,
} from "./creditfactuur";
import { allocate, countsAsRevenue, omzetDatum, takDetails, aansluiting, type OmzetRegel } from "./omzet";

const extern = { invoice_kind: "extern", subtotal: 2789.91, vat: 585.88, total: 3375.79, status: "verstuurd", payment_status: "open" };
const poets = { invoice_kind: "poets_intern", subtotal: 8264, vat: 1736, total: 10000, status: "verstuurd", payment_status: "open" };

describe("btw op creditfacturen", () => {
  it("21%: € 100 excl. → −100 / −21 / −121", () => {
    expect(creditBedragen(extern, creditInfo(extern, []), 100)).toEqual({ subtotal: -100, vat: -21, total: -121 });
  });
  it("poets 100/82,64: één beurt € 82,64 → −82,64 / −17,36 / −100", () => {
    expect(creditBedragen(poets, creditInfo(poets, []), 82.64)).toEqual({ subtotal: -82.64, vat: -17.36, total: -100 });
  });
  it("poets € 100 excl. → incl. € 121,01 (zelfde afronding als de RPC)", () => {
    expect(creditBedragen(poets, creditInfo(poets, []), 100)).toEqual({ subtotal: -100, vat: -21.01, total: -121.01 });
  });
  it("volledig = exact het origineel, netto nul", () => {
    expect(creditBedragen(extern, creditInfo(extern, []), 2789.91)).toEqual({ subtotal: -2789.91, vat: -585.88, total: -3375.79 });
  });
  it("laatste deelcredit maakt btw en totaal exact nul", () => {
    const orig = { invoice_kind: "extern", subtotal: 1000, vat: 210, total: 1210 };
    const al = [{ subtotal: -250, vat: -52.5, total: -302.5 }, { subtotal: -600, vat: -126, total: -726 }];
    const rest = creditBedragen(orig, creditInfo(orig, al), 150);
    expect(rest).toEqual({ subtotal: -150, vat: -31.5, total: -181.5 });
    const info = creditInfo(orig, [...al, rest]);
    expect(info.nogExcl).toBe(0); expect(info.nogIncl).toBe(0); expect(info.volledig).toBe(true);
  });
});

describe("nog te crediteren en badges", () => {
  it("deelcredit € 250 op € 1000 → nog € 750", () => {
    const orig = { invoice_kind: "extern", subtotal: 1000, vat: 210, total: 1210 };
    expect(creditInfo(orig, [{ subtotal: -250, vat: -52.5, total: -302.5 }]).nogExcl).toBe(750);
  });
  it("volledig gecrediteerd + open → badge Volledig gecrediteerd en label gecrediteerd", () => {
    const info = creditInfo(extern, [{ subtotal: -2789.91, vat: -585.88, total: -3375.79 }]);
    expect(creditBadge(extern, info)?.label).toBe("Volledig gecrediteerd");
    expect(betaalLabel(extern, info)).toBe("gecrediteerd");
    expect(crediteerbaar(extern, info)).toBe(false);
  });
  it("al betaald → Terugbetaling nodig met het gecrediteerde bedrag incl. btw", () => {
    const paid = { ...extern, payment_status: "betaald" };
    const info = creditInfo(paid, [{ subtotal: -100, vat: -21, total: -121 }]);
    expect(creditBadge(paid, info)?.label.replace(/\s/g, " ")).toBe("Terugbetaling nodig: € 121,00");
    expect(betaalLabel(paid, info)).toBe("betaald");
  });
  it("deelcredit → '€ X gecrediteerd'", () => {
    const info = creditInfo(extern, [{ subtotal: -100, vat: -21, total: -121 }]);
    expect(creditBadge(extern, info)?.label.replace(/\s/g, " ")).toBe("€ 121,00 gecrediteerd");
    expect(betaalLabel(extern, info)).toBe("open");
  });
  it("concept, creditfactuur en telt-niet-mee zijn niet te crediteren", () => {
    const leeg = creditInfo(extern, []);
    expect(crediteerbaar({ ...extern, status: "concept" }, leeg)).toBe(false);
    expect(crediteerbaar({ ...extern, document_type: "creditfactuur" }, leeg)).toBe(false);
    expect(crediteerbaar({ ...extern, telt_niet_mee: true }, leeg)).toBe(false);
    expect(crediteerbaar(extern, leeg)).toBe(true);
  });
});

describe("rechten crediteren", () => {
  it("owner, admin, aftersales_manager en operationeel_directeur mogen", () => {
    for (const r of ["owner", "admin", "aftersales_manager", "operationeel_directeur"]) expect(mayCrediteer(r)).toBe(true);
  });
  it("verkoper, monteur, werkplaats_chef en administratie niet", () => {
    for (const r of ["verkoper", "monteur", "werkplaats_chef", "administratie", "manager"]) expect(mayCrediteer(r)).toBe(false);
  });
});

describe("telregel en maand van crediteren", () => {
  it("creditfactuur telt altijd mee, ook als concept (interne dispatch)", () => {
    expect(countsAsRevenue({ invoice_kind: "intern", status: "concept", document_type: "creditfactuur" })).toBe(true);
    expect(countsAsRevenue({ invoice_kind: "extern", status: "definitief", document_type: "creditfactuur" })).toBe(true);
    expect(countsAsRevenue({ invoice_kind: "extern", status: "concept", document_type: "creditfactuur" })).toBe(true);
  });
  it("creditfactuur met telt_niet_mee telt niet", () => {
    expect(countsAsRevenue({ invoice_kind: "extern", status: "definitief", document_type: "creditfactuur", telt_niet_mee: true })).toBe(false);
  });
  it("omzetdatum = creditdag in NL-tijd, ook voor intern (niet de goedkeuringsdag)", () => {
    const linked = [{ approved_at: "2026-09-10T10:00:00Z", finished_at: null }];
    expect(omzetDatum("intern", "2026-11-30T23:30:00Z", linked, "creditfactuur")).toBe("2026-12-01");
    expect(omzetDatum("poets_intern", "2026-11-01T09:00:00Z", linked, "creditfactuur")).toBe("2026-11-01");
  });
});

describe("pro-rata toerekening van de credit", () => {
  const orders = [
    { id: "a", discipline: "spuit", assigned_to: "m1", parts: [1, 2, 3] },
    { id: "b", discipline: "spuit", assigned_to: "m2", parts: [1] },
  ];
  it("credit gaat naar dezelfde medewerkers in dezelfde verhouding (spiegelbeeld van het origineel)", () => {
    const orig = allocate(1200, "schadeherstel", orders);
    const cred = allocate(-1200, "schadeherstel", orders);
    expect(orig.map(x => x.bedrag)).toEqual([900, 300]);
    expect(cred.map(x => x.bedrag)).toEqual([-900, -300]);
  });
  it("afronding is symmetrisch: −1000/3 rondt als 1000/3", () => {
    const three = [{ id: "a", discipline: "werkplaats", assigned_to: "m1" }, { id: "b", discipline: "werkplaats", assigned_to: "m2" }, { id: "c", discipline: "werkplaats", assigned_to: "m3" }];
    expect(allocate(-1000, "werkplaats", three).map(x => x.bedrag)).toEqual(allocate(1000, "werkplaats", three).map(x => -x.bedrag));
  });
  it("ongekoppelde credit = niet toegewezen", () => {
    expect(allocate(-100, "werkplaats", [])).toEqual([{ work_order_id: null, medewerker_id: null, bedrag: -100 }]);
  });
});

describe("rapportage met credit", () => {
  const regel = (p: Partial<OmzetRegel>): OmzetRegel => ({
    invoice_id: "i", invoice_number: "AR", invoice_kind: "extern", tak: "werkplaats", omzet_datum: "2026-11-15",
    subtotal: 0, total: 0, status: "verstuurd", branch: "rotterdam", created_at: "2026-11-15T10:00:00Z", klant: null, kenteken: null,
    telt_mee: true, telt_niet_mee: false, telt_niet_mee_reden: null, gekoppeld: true, work_order_id: "w", discipline: "werkplaats",
    medewerker_id: "m1", aandeel_delen: 1, bedrag: 0, document_type: "factuur", ...p,
  });
  const regels = [
    regel({ invoice_id: "f1", subtotal: 500, bedrag: 500 }),
    regel({ invoice_id: "c1", subtotal: -200, bedrag: -200, status: "definitief", document_type: "creditfactuur" }),
  ];
  it("omzet gaat omlaag, maar een credit telt niet als extra order", () => {
    const d = takDetails(regels).werkplaats;
    expect(d.total).toBe(300); expect(d.invoices).toBe(1); expect(d.parts).toBe(1);
  });
  it("aansluiting blijft sluiten", () => {
    const a = aansluiting(regels);
    expect(a.totaal).toBe(300); expect(a.medewerkers).toBe(300); expect(a.sluit).toBe(true);
  });
});

describe("documenttekst en invoer", () => {
  it("tekst met origineel nummer en datum (NL)", () => {
    expect(creditDocumentTekst("AR-2026-0114", "2026-09-25T08:00:00Z", " Dubbel gefactureerd ")).toBe(
      "Creditering van factuur AR-2026-0114 d.d. 25-09-2026. Reden: Dubbel gefactureerd");
  });
  it("bedragen in NL-notatie", () => {
    expect(parseBedrag("1.234,56")).toBe(1234.56);
    expect(parseBedrag("€ 100")).toBe(100);
    expect(parseBedrag("82.64")).toBe(82.64);
    expect(parseBedrag("")).toBeNull();
    expect(parseBedrag("abc")).toBeNull();
  });
});
