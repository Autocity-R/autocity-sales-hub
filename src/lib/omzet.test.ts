import { describe, it, expect } from "vitest";
import { allocate, countsAsRevenue, linkedOrderIds, omzetDatum, aansluiting, takTotals, liveOmzetRegels, pendingPoets, nlDate, nlDayStart, type PoetsBeurt, type OmzetRegel } from "./omzet";

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

describe("live poets revenue", () => {
  const beurt: PoetsBeurt = { id: "b1", day: "2026-11-04", assigned_to: "p1", vehicle_id: null, branch: "rotterdam", intern: true };
  const invoice = (beurten: PoetsBeurt[]): OmzetRegel[] => beurten.map(b => ({
    invoice_id: "monthly", invoice_number: null, invoice_kind: "poets_intern", tak: "poets",
    omzet_datum: "2026-11-30", subtotal: 826.4, total: 1000, status: "concept", branch: "rotterdam",
    created_at: "2026-12-01T08:00:00Z", klant: null, kenteken: null, telt_mee: true, telt_niet_mee: false,
    telt_niet_mee_reden: null, gekoppeld: true, work_order_id: b.id, discipline: "poets",
    medewerker_id: b.assigned_to, aandeel_delen: 1, bedrag: 82.64,
  }));
  const ten = Array.from({ length: 10 }, (_, i) => ({ ...beurt, id: `b${i}` }));
  it("month without invoice: 10 × 82.64 = 826.40 live", () => {
    const rows = liveOmzetRegels([], ten, new Set(), "2026-11-01", "2026-12-01");
    expect(takTotals(rows).poets).toBe(826.4);
    expect(takTotals(rows).totaal).toBe(826.4);
    expect(aansluiting(rows).medewerkers).toBe(826.4);
    expect(aansluiting(rows).sluit).toBe(true);
  });
  it("invoice moves pending to invoiced without changing month total", () => {
    const ids = new Set(ten.map(b => b.id));
    const rows = liveOmzetRegels(invoice(ten), ten, ids, "2026-11-01", "2026-12-01");
    expect(pendingPoets(ten, ids, "2026-11-01", "2026-12-01").bedrag).toBe(0);
    expect(takTotals(rows).poets).toBe(826.4);
    expect(aansluiting(rows).medewerkers).toBe(826.4);
    expect(aansluiting(rows).sluit).toBe(true);
  });
  it("31 October 23:30 NL stays October, finished date wins over approval", () => {
    const finished = "2026-10-31T22:30:00Z";
    const b = { ...beurt, day: nlDate(finished) };
    expect(omzetDatum("poets_intern", "2026-11-01T09:00:00Z", [{ finished_at: finished, approved_at: "2026-11-01T08:00:00Z" }])).toBe("2026-10-31");
    expect(takTotals(liveOmzetRegels([], [b], new Set(), "2026-10-01", "2026-11-01")).poets).toBe(82.64);
    expect(takTotals(liveOmzetRegels([], [b], new Set(), "2026-11-01", "2026-12-01")).poets).toBe(0);
    expect(nlDayStart("2026-10-01")).toBe("2026-09-30T22:00:00.000Z");
    expect(nlDayStart("2026-11-01")).toBe("2026-10-31T23:00:00.000Z");
  });
  it("unassigned work never counts, even if marked internal", () => {
    const rows = liveOmzetRegels([], [{ ...beurt, assigned_to: null }], new Set(), "2026-11-01", "2026-12-01");
    expect(takTotals(rows).poets).toBe(0);
  });
  it("external and missing profile work are excluded", () => {
    expect(pendingPoets([{ ...beurt, intern: false }, { ...beurt, id: "missing", intern: null }], new Set(), "2026-11-01", "2026-12-01").count).toBe(0);
  });
});
