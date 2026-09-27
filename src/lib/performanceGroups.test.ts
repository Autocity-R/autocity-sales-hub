import { describe, it, expect } from "vitest";
import { unionSeconds, fairSeconds, groupOrders, suspiciousTimer, possibleDuplicates, cleanDescription, fairSecondsByAssignee, pendingInvoiceAmount, linkedExternalInvoice } from "./performanceGroups";

const o = (id: string, start: string, end: string, extra: any = {}) => ({
  id, vehicle_id: "v1", discipline: "spuit", status: "goedgekeurd", assigned_to: "u1",
  created_at: start, started_at: start, finished_at: end,
  work_seconds: (+new Date(end) - +new Date(start)) / 1000, ...extra,
});

describe("unionSeconds", () => {
  it("telt overlap één keer", () => {
    expect(unionSeconds([[0, 10000], [5000, 15000], [20000, 25000]])).toBe(20);
    expect(unionSeconds([])).toBe(0);
    expect(unionSeconds([[0, 10000], [0, 10000], [0, 10000]])).toBe(10);
  });
});

describe("groepering", () => {
  const kvh = [
    o("a", "2026-09-24T07:48:35Z", "2026-09-24T08:43:15Z"),
    o("b", "2026-09-24T07:48:48Z", "2026-09-24T08:43:19Z"),
    o("c", "2026-09-24T07:48:58Z", "2026-09-24T08:43:08Z"),
    o("d", "2026-09-24T07:49:24Z", "2026-09-24T08:43:05Z"),
  ];
  it("4 parallelle onderdelen = één card met unie-tijd", () => {
    const g = groupOrders(kvh);
    expect(g).toHaveLength(1);
    expect(g[0].orders).toHaveLength(4);
    expect(g[0].parallel).toBe(true);
    expect(Math.round(g[0].fairSeconds)).toBe(3284);
    expect(g[0].sumSeconds).toBeGreaterThan(13000);
  });
  it("andere auto of dag = aparte card", () => {
    const g = groupOrders([...kvh, o("x", "2026-09-24T07:48:35Z", "2026-09-24T08:00:00Z", { vehicle_id: "v2" }), o("y", "2026-09-25T07:00:00Z", "2026-09-25T08:00:00Z")]);
    expect(g).toHaveLength(3);
  });
  it("zelfde auto/dag maar niet overlappend = aparte cards", () => {
    const g = groupOrders([o("p", "2026-09-24T07:00:00Z", "2026-09-24T08:00:00Z"), o("q", "2026-09-24T10:00:00Z", "2026-09-24T11:00:00Z")]);
    expect(g).toHaveLength(2);
  });
  it("timer over de nacht is verdacht", () => {
    const k = o("k", "2026-09-24T11:37:42Z", "2026-09-25T05:51:48Z");
    expect(suspiciousTimer(k)!.toFixed(1)).toBe("18.2");
    expect(suspiciousTimer(kvh[0])).toBeNull();
  });
  it("eerlijke tijd per medewerker: overlap alleen binnen dezelfde persoon", () => {
    const a = o("a", "2026-09-24T07:00:00Z", "2026-09-24T08:00:00Z");
    const b = o("b", "2026-09-24T07:00:00Z", "2026-09-24T08:00:00Z", { assigned_to: "u2" });
    expect(fairSecondsByAssignee([a, b])).toBe(7200);
    expect(fairSeconds([a, { ...b, assigned_to: "u1" }])).toBe(3600);
  });
});

describe("dubbel + omschrijving", () => {
  it("markeert alleen echte dubbelen", () => {
    const base = { vehicle_id: "v", discipline: "spuit", part: "Motorkap", description: "krassen" };
    const s = possibleDuplicates([
      { id: "1", ...base, created_at: "2026-09-24T07:00:00Z" },
      { id: "2", ...base, description: "krassen\n[ingepland op do 24/9 09:00]", created_at: "2026-09-24T07:03:00Z" },
      { id: "3", ...base, part: "Dak", created_at: "2026-09-24T07:01:00Z" },
      { id: "4", ...base, created_at: "2026-09-24T07:20:00Z" },
    ]);
    expect([...s].sort()).toEqual(["1", "2"]);
  });
  it("haalt ingepland-regels weg", () => {
    expect(cleanDescription("Blanke lak\n[ingepland op wo 23/9 10:00]")).toBe("Blanke lak");
  });
});

describe("nog te factureren", () => {
  const invoices = [{ invoice_kind: "intern", status: "concept", work_order_id: null, source_work_order_ids: ["invoiced"] }];
  const order = { id: "spuit", discipline: "spuit", status: "goedgekeurd", origin: "intern", part: "bumper", parts: ["bumper", "portier", "motorkap"] };

  it("rekent €300 per spuitdeel en €300 per werkplaatsorder", () => {
    expect(pendingInvoiceAmount(order, invoices)).toBe(900);
    expect(pendingInvoiceAmount({ ...order, id: "werk", discipline: "werkplaats", parts: ["a", "b"] }, invoices)).toBe(300);
  });

  it("sluit reeds gefactureerd, niet-goedgekeurd en extern werk uit", () => {
    expect(pendingInvoiceAmount({ ...order, id: "invoiced" }, invoices)).toBe(0);
    expect(pendingInvoiceAmount({ ...order, status: "afgerond" }, invoices)).toBe(0);
    expect(pendingInvoiceAmount({ ...order, origin: "extern" }, invoices)).toBe(0);
  });

  it("herkent een externe factuur alleen via de directe work_order-koppeling", () => {
    const external = { invoice_kind: "extern", status: "verstuurd", work_order_id: "extern-order", source_work_order_ids: [] };
    expect(linkedExternalInvoice("extern-order", [external])?.status).toBe("verstuurd");
    expect(linkedExternalInvoice("ander", [external])).toBeNull();
  });
});
