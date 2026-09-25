import { describe, it, expect } from "vitest";
import { getChecklistProgress, sortB2CVehicles } from "./checklistProgress";
import { splitPoetsRows } from "@/components/werkplaats/poetsDeadline";
import { pickDeliveryMoments, formatDeliveryMoment } from "@/components/werkplaats/deliveryAppointment";

const v = (id: string, done: number, total: number, extra: any = {}) => ({
  id, details: { preDeliveryChecklist: Array.from({ length: total }, (_, i) => ({ completed: i < done })) }, ...extra,
}) as any;

describe("checklist-voortgang + sortering", () => {
  it("berekent afgevinkt/totaal", () => {
    expect(getChecklistProgress(v("a", 3, 5))).toMatchObject({ completed: 3, total: 5, percentage: 60, hasItems: true });
    expect(getChecklistProgress({ details: {} } as any)).toMatchObject({ percentage: 0, hasItems: false });
  });
  it("oplopend: laagste eerst, auto zonder items achteraan; aflopend omgekeerd", () => {
    const list = [v("x", 0, 0), v("b", 4, 4), v("a", 1, 4), v("c", 0, 3)];
    expect(sortB2CVehicles(list, "checklistProgress", "asc").map(x => x.id)).toEqual(["c", "a", "b", "x"]);
    expect(sortB2CVehicles(list, "checklistProgress", "desc").map(x => x.id)).toEqual(["b", "a", "c", "x"]);
  });
  it("tekst- en getalkolommen sorteren, lege waarden onderaan", () => {
    const list = [v("1", 0, 0, { brand: "Tesla", mileage: 50 }), v("2", 0, 0, { brand: "audi" }), v("3", 0, 0, { brand: "BMW", mileage: 10 })];
    expect(sortB2CVehicles(list, "brand", "asc").map(x => x.id)).toEqual(["2", "3", "1"]);
    expect(sortB2CVehicles(list, "mileage", "desc").map(x => x.id)).toEqual(["1", "3", "2"]);
  });
});

describe("poets afleveringen via afspraak", () => {
  const now = new Date("2026-09-25T06:00:00Z");
  const moments = pickDeliveryMoments([
    { vehicleid: "tesla", starttime: "2026-10-03T08:00:00+00:00", status: "gepland", type: "aflevering" },
    { vehicleid: "tesla", starttime: "2026-10-05T08:00:00+00:00", status: "gepland", type: "aflevering" },
    { vehicleid: "x", starttime: "2026-09-26T08:00:00+00:00", status: "geannuleerd", type: "aflevering" },
  ], now);
  it("label in NL-tijd", () => {
    expect(formatDeliveryMoment("2026-10-03T08:00:00+00:00")).toBe("za 03-10 10:00");
    expect(moments.tesla.label).toBe("za 03-10 10:00");
    expect(moments.x).toBeUndefined();
  });
  it("showroom-opdracht met afspraak → afleveringen, gesorteerd op deadline", () => {
    const rows = [
      { id: "1", poets_type: "showroom", due_date: null, created_at: "a", vehicle: { id: "tesla" } },
      { id: "2", poets_type: "aflevering", due_date: "2026-09-27", created_at: "b", vehicle: { id: "y" } },
      { id: "3", poets_type: "showroom", due_date: null, created_at: "c", vehicle: { id: "x" } },
    ];
    const { afleveringen, showroom } = splitPoetsRows(rows, moments, now);
    expect(afleveringen.map(r => r.id)).toEqual(["2", "1"]);
    expect(showroom.map(r => r.id)).toEqual(["3"]);
  });
});
