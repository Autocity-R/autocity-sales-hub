import { describe, it, expect } from "vitest";
import { splitWorkOrdersByDelivery, plateKey, samePlate, fmtHours, sortAfter, deliveryDay } from "./workHistory";

const D = "2026-09-11T00:00:00Z"; // afleverdag 11 sept (kale datum)

describe("splitWorkOrdersByDelivery", () => {
  it("order op de afleverdag om 23:30 NL-tijd = vóór", () => {
    // 23:30 CEST = 21:30Z
    const r = splitWorkOrdersByDelivery([{ created_at: "2026-09-11T21:30:00Z" }], D);
    expect(r.before).toHaveLength(1);
  });
  it("order om 00:30 NL-tijd de dag erna = na", () => {
    // 12 sept 00:30 CEST = 11 sept 22:30Z
    const r = splitWorkOrdersByDelivery([{ created_at: "2026-09-11T22:30:00Z" }], D);
    expect(r.after).toHaveLength(1);
  });
  it("order 's ochtends op de afleverdag (na middernacht UTC) = vóór", () => {
    expect(splitWorkOrdersByDelivery([{ created_at: "2026-09-11T08:00:00Z" }], D).before).toHaveLength(1);
  });
  it("checklist telt altijd als vóór", () => {
    const r = splitWorkOrdersByDelivery([{ created_at: "2026-10-01T10:00:00Z", source: "checklist" }], D);
    expect(r.before).toHaveLength(1);
    expect(r.after).toHaveLength(0);
  });
  it("garantie weken later = na; zonder afleverdatum alles vóór", () => {
    expect(splitWorkOrdersByDelivery([{ created_at: "2026-10-02T10:00:00Z", source: "garantie" }], D).after).toHaveLength(1);
    expect(splitWorkOrdersByDelivery([{ created_at: "2026-10-02T10:00:00Z" }], null).before).toHaveLength(1);
  });
  it("afleverdatum met tijd wordt in NL-tijd naar een dag omgezet", () => {
    expect(deliveryDay("2026-09-11T22:30:00Z")).toBe("2026-09-12");
    expect(deliveryDay("2026-09-11")).toBe("2026-09-11");
  });
});

describe("kenteken-matching", () => {
  it("normaliseert streepjes, spaties en hoofdletters", () => {
    expect(plateKey("kvh-62-d")).toBe("KVH62D");
    expect(samePlate("KVH 62 D", "kvh-62-d")).toBe(true);
  });
  it("korte interne nummers matchen nooit", () => {
    expect(plateKey("4470")).toBeNull();
    expect(samePlate("4470", "4470")).toBe(false);
    expect(samePlate("", "")).toBe(false);
  });
  it("geen fuzzy match", () => {
    expect(samePlate("KVH-62-D", "KVH-62-E")).toBe(false);
  });
});

describe("weergave", () => {
  it("uren:minuten", () => {
    expect(fmtHours(5400)).toBe("1:30");
    expect(fmtHours(null)).toBe("0:00");
  });
  it("open eerst, daarna nieuwste bovenaan", () => {
    const s = sortAfter([
      { status: "goedgekeurd", created_at: "2026-10-05" },
      { status: "ingepland", created_at: "2026-09-20" },
      { status: "afgerond", created_at: "2026-10-09" },
    ]);
    expect(s.map(x => x.created_at)).toEqual(["2026-09-20", "2026-10-09", "2026-10-05"]);
  });
});
