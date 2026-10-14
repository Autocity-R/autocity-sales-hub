import { describe, it, expect } from "vitest";
import { allocate, countsAsRevenue, linkedOrderIds, omzetDatum, aansluiting, takTotals, type OmzetRegel } from "./omzet";

describe("koppel-fallback", () => {
  it("[] valt terug op work_order_id", () => expect(linkedOrderIds([], "wo1")).toEqual(["wo1"]));
  it("niet-lege source ids winnen", () => expect(linkedOrderIds(["a", "b"], "wo1")).toEqual(["a", "b"]));
  it("niets gekoppeld", () => expect(linkedOrderIds(null, null)).toEqual([]));
});

describe("telregel", () => {
  it("automatisch intern concept telt", () => expect(countsAsRevenue({ invoice_kind: "intern", status: "concept" })).toBe(true));
  it("poets-concept telt", () => expect(countsAsRevenue({ invoice_kind: "poets_intern", status: "concept" })).toBe(true));
  it("handmatig concept telt niet", () => expect(countsAsRevenue({ invoice_kind: "extern", status: "concept" })).toBe(false));
  it("telt_niet_mee telt niet", () => expect(countsAsRevenue({ invoice_kind: "extern", status: "verstuurd", telt_niet_mee: true })).toBe(false));
  it("verstuurd extern telt", () => expect(countsAsRevenue({ invoice_kind: "extern", status: "verstuurd" })).toBe(true));
});

describe("omzet_datum (NL-tijd)", () => {
  it("intern: goedkeuring 31-8 23:30 NL = augustus, ook als factuur 1-9 is gemaakt", () => {
    expect(omzetDatum("intern", "2026-09-01T06:00:00Z", [{ approved_at: "2026-08-31T21:30:00Z", finished_at: null }])).toBe("2026-08-31");
  });
  it("intern: laatste gekoppelde goedkeuring telt", () => {
    expect(omzetDatum("intern", "2026-10-01T08:00:00Z", [
      { approved_at: "2026-09-10T10:00:00Z", finished_at: null },
      { approved_at: "2026-09-30T21:30:00Z", finished_at: null }, // 23:30 NL op de 30e
    ])).toBe("2026-09-30");
  });
  it("intern: 00:30 NL op de 1e = nieuwe maand", () => {
    expect(omzetDatum("intern", "2026-10-01T08:00:00Z", [{ approved_at: "2026-09-30T22:30:00Z", finished_at: null }])).toBe("2026-10-01");
  });
  it("poets: werkdag laatste beurt", () => {
    expect(omzetDatum("poets_intern", "2026-10-01T05:00:00Z", [{ approved_at: null, finished_at: "2026-09-30T15:00:00Z" }])).toBe("2026-09-30");
  });
  it("extern: factuurdatum in NL-tijd", () => {
    expect(omzetDatum("extern", "2026-08-31T22:30:00Z", [{ approved_at: "2026-08-01T10:00:00Z", finished_at: null }])).toBe("2026-09-01");
  });
});

describe("toerekening", () => {
  it("spuit per deel", () => {
    const r = allocate(1500, "schadeherstel", [
      { id: "a", discipline: "spuit", assigned_to: "p1", parts: ["x", "y"] },
      { id: "b", discipline: "spuit", assigned_to: "p2", parts: ["z", "q", "r"] },
    ]);
    expect(r.map(x => x.bedrag)).toEqual([600, 900]);
  });
  it("extern gekoppeld: volledig naar uitvoerder", () => {
    expect(allocate(2789.91, "schadeherstel", [{ id: "a", discipline: "spuit", assigned_to: "p1", parts: [] }]))
      .toEqual([{ work_order_id: "a", medewerker_id: "p1", bedrag: 2789.91 }]);
  });
  it("meerdere orders zonder delen: naar rato", () => {
    expect(allocate(300, "werkplaats", [{ id: "a", discipline: "werkplaats", assigned_to: "p1" }, { id: "b", discipline: "werkplaats", assigned_to: "p2" }]).map(x => x.bedrag)).toEqual([150, 150]);
  });
  it("ongekoppeld: niet toegewezen", () => {
    expect(allocate(349.75, "werkplaats", [])).toEqual([{ work_order_id: null, medewerker_id: null, bedrag: 349.75 }]);
  });
});

describe("aansluiting", () => {
  const base = { invoice_number: "", invoice_kind: "intern", total: 0, status: "verstuurd", branch: null, created_at: "", klant: null, kenteken: null, telt_niet_mee: false, telt_niet_mee_reden: null, discipline: null, aandeel_delen: 1, omzet_datum: "2026-09-01" };
  const regels = [
    { ...base, invoice_id: "1", tak: "schadeherstel", subtotal: 600, telt_mee: true, gekoppeld: true, work_order_id: "a", medewerker_id: "p1", bedrag: 600 },
    { ...base, invoice_id: "2", tak: "werkplaats", subtotal: 100, telt_mee: true, gekoppeld: false, work_order_id: null, medewerker_id: null, bedrag: 100 },
    { ...base, invoice_id: "3", tak: "werkplaats", subtotal: 1, telt_mee: false, gekoppeld: false, work_order_id: null, medewerker_id: null, bedrag: 1 },
  ] as OmzetRegel[];
  it("sluit en sluit niet-meetellende uit", () => {
    expect(takTotals(regels)).toEqual({ schadeherstel: 600, werkplaats: 100, poets: 0, totaal: 700 });
    const a = aansluiting(regels);
    expect(a.sluit).toBe(true);
    expect(a.nietToegewezen).toBe(100);
  });
});
