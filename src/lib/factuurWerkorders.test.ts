import { describe, it, expect } from "vitest";
import { bronLabel, urenPerPersoon, mogelijkDubbel, fmtNlDatumTijd, type DubbelFactuur, type DubbelOrder } from "./factuurWerkorders";

describe("bronLabel", () => {
  it("benoemt de bron zoals de eigenaar hem kent", () => {
    expect(bronLabel({ source: "checklist", origin: "intern" })).toBe("Checklist / rijklaar");
    expect(bronLabel({ source: "garantie", origin: "intern" })).toBe("Garantie");
    expect(bronLabel({ source: "aftersales", origin: "intern" })).toBe("Aftersales / handmatig");
    expect(bronLabel({ source: "inname", origin: "intern" })).toBe("Inname");
    expect(bronLabel({ source: "inname_auto", origin: "intern" })).toBe("Inname");
    expect(bronLabel({ source: null, origin: "intern" })).toBe("Handmatig");
  });
  it("een externe klant wint altijd", () => {
    expect(bronLabel({ source: "aftersales", origin: "extern" })).toBe("Extern");
    expect(bronLabel({ source: "aftersales", origin: "intern", external_customer_name: "Jansen" })).toBe("Extern");
  });
});

describe("urenPerPersoon", () => {
  it("zonder tijdregels: alle werktijd naar de uitvoerder", () => {
    const r = urenPerPersoon({ id: "o", assigned_to: "piet", work_seconds: 5400, tijdregels: [] });
    expect(r.perTijdregel).toBe(false);
    expect(r.regels).toEqual([{ persoon: "piet", seconden: 5400 }]);
  });
  it("met tijdregels: uren bij wie ze maakte (overnemen)", () => {
    const r = urenPerPersoon({
      id: "o", assigned_to: "kees", work_seconds: 9999,
      tijdregels: [
        { work_order_id: "o", user_id: "piet", gestart_op: "2026-11-17T08:00:00Z", gestopt_op: "2026-11-17T09:00:00Z", stop_reden: "overgenomen", vooraf_seconden: 0 },
        { work_order_id: "o", user_id: "kees", gestart_op: "2026-11-17T09:00:00Z", gestopt_op: "2026-11-17T09:30:00Z", stop_reden: "afgerond", vooraf_seconden: 0 },
      ],
    });
    expect(r.perTijdregel).toBe(true);
    expect(r.regels).toEqual([{ persoon: "piet", seconden: 3600 }, { persoon: "kees", seconden: 1800 }]);
  });
});

describe("fmtNlDatumTijd", () => {
  it("toont NL-tijd (winter = UTC+1)", () => {
    expect(fmtNlDatumTijd("2026-11-16T23:30:00Z")).toBe("17-11-2026 00:30");
    expect(fmtNlDatumTijd(null)).toBe("—");
  });
});

describe("mogelijkDubbel", () => {
  const f = (id: string, nr: string, created: string, orderId: string, extra: Partial<DubbelFactuur> = {}): DubbelFactuur => ({
    id, invoice_number: nr, created_at: created, invoice_kind: "intern", document_type: "factuur",
    work_order_id: null, source_work_order_ids: [orderId], ...extra,
  });
  const o = (id: string, vehicle: string, approved: string, extra: Partial<DubbelOrder> = {}): DubbelOrder => ({
    id, vehicle_id: vehicle, discipline: "werkplaats", source: "checklist", approved_at: approved, ...extra,
  });
  const orders = [o("o1", "A", "2026-09-01T10:00:00Z"), o("o2", "A", "2026-10-01T10:00:00Z"), o("o3", "B", "2026-10-01T10:00:00Z")];
  const facturen = [f("f1", "AR-1", "2026-09-01T10:00:00Z", "o1"), f("f2", "AR-2", "2026-10-01T10:00:00Z", "o2"), f("f3", "AR-3", "2026-10-01T10:00:00Z", "o3")];

  it("de 2e rijklaar-factuur van dezelfde auto is mogelijk dubbel, met link naar de 1e", () => {
    const m = mogelijkDubbel(facturen, orders, () => false);
    expect([...m.keys()]).toEqual(["f2"]);
    expect(m.get("f2")).toEqual({ actief: true, andere: ["f1"] });
  });
  it("een volledig gecrediteerde dubbele factuur toont 'gecorrigeerd' en telt niet in het filter", () => {
    const m = mogelijkDubbel(facturen, orders, (id) => id === "f2");
    expect(m.get("f2")).toEqual({ actief: false, andere: ["f1"] });
  });
  it("is de eerste volledig gecrediteerd, dan is de tweede niet meer dubbel", () => {
    expect(mogelijkDubbel(facturen, orders, (id) => id === "f1").size).toBe(0);
  });
  it("alleen interne werkplaatsfacturen van checklist-orders tellen", () => {
    const extra = [o("o4", "A", "2026-11-01T10:00:00Z", { source: "garantie" }), o("o5", "A", "2026-11-02T10:00:00Z", { discipline: "spuit" })];
    const fx = [...facturen, f("f4", "AR-4", "2026-11-01T10:00:00Z", "o4"), f("f5", "AR-5", "2026-11-02T10:00:00Z", "o5"),
      f("f6", "AR-6", "2026-11-03T10:00:00Z", "o2", { document_type: "creditfactuur" })];
    expect([...mogelijkDubbel(fx, [...orders, ...extra], () => false).keys()]).toEqual(["f2"]);
  });
  it("volgorde op goedkeurdatum van de order, niet op factuurdatum", () => {
    const fx = [f("f1", "AR-9", "2026-09-01T10:00:00Z", "o2"), f("f2", "AR-1", "2026-10-01T10:00:00Z", "o1")];
    // f2 hoort bij o1 (eerder goedgekeurd) → f1 is de dubbele
    expect([...mogelijkDubbel(fx, orders, () => false).keys()]).toEqual(["f1"]);
  });
  it("valt terug op work_order_id als source_work_order_ids leeg is", () => {
    const fx = [f("f1", "AR-1", "2026-09-01T10:00:00Z", "x", { source_work_order_ids: [], work_order_id: "o1" }),
      f("f2", "AR-2", "2026-10-01T10:00:00Z", "x", { source_work_order_ids: null, work_order_id: "o2" })];
    expect([...mogelijkDubbel(fx, orders, () => false).keys()]).toEqual(["f2"]);
  });
});
