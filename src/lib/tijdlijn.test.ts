import { describe, it, expect } from "vitest";
import {
  formatEventTs, dagKey, dagKop, groupPerDag, filterOpCategorie, dagenTussen,
  type TijdlijnEvent,
} from "./tijdlijn";

const ev = (over: Partial<TijdlijnEvent>): TijdlijnEvent => ({
  ts: "2026-09-09T10:00:00Z", heeft_tijd: true, categorie: "werkplaats", type: "order_aangemaakt",
  titel: "Werkplaats aangemaakt", detail: null, door_naam: null, bron_tabel: "work_orders",
  bron_id: "x", via_ander_record: false, ...over,
});

describe("formatEventTs (Europe/Amsterdam)", () => {
  it("toont dd-mm-jjjj uu:mm in NL-tijd", () => {
    // 10:43 UTC = 12:43 NL (zomertijd, UTC+2)
    expect(formatEventTs("2026-09-07T10:43:17Z", true)).toBe("07-09-2026 12:43");
  });

  it("randgeval 23:30: 21:30 UTC valt nog op dezelfde NL-dag", () => {
    expect(formatEventTs("2026-09-09T21:30:00Z", true)).toBe("09-09-2026 23:30");
  });

  it("randgeval over middernacht: 22:30 UTC wordt de volgende NL-dag", () => {
    expect(formatEventTs("2026-09-09T22:30:00Z", true)).toBe("10-09-2026 00:30");
  });

  it("wintertijd: 23:30 UTC = 00:30 NL volgende dag", () => {
    expect(formatEventTs("2026-01-15T23:30:00Z", true)).toBe("16-01-2026 00:30");
  });

  it("datum zonder tijd toont geen tijd", () => {
    expect(formatEventTs("2026-09-10T00:00:00Z", false)).toBe("10-09-2026");
  });
});

describe("dagKey / dagKop", () => {
  it("dagKey volgt de NL-kalenderdag", () => {
    expect(dagKey("2026-09-09T21:30:00Z")).toBe("2026-09-09");
    expect(dagKey("2026-09-09T22:30:00Z")).toBe("2026-09-10");
  });

  it("dagKop toont NL-dagkop", () => {
    expect(dagKop("2026-09-09T10:00:00Z")).toBe("wo 9 sep 2026");
  });
});

describe("groupPerDag", () => {
  it("groepeert per NL-dag, nieuwste bovenaan", () => {
    const groepen = groupPerDag([
      ev({ ts: "2026-09-09T08:00:00Z", titel: "a" }),
      ev({ ts: "2026-09-10T09:00:00Z", titel: "b" }),
      ev({ ts: "2026-09-09T12:00:00Z", titel: "c" }),
      ev({ ts: "2026-09-09T21:30:00Z", titel: "d-2330" }), // nog 9 sep NL
      ev({ ts: "2026-09-09T22:30:00Z", titel: "e-0030" }), // 10 sep NL
    ]);
    expect(groepen.map(g => g.key)).toEqual(["2026-09-10", "2026-09-09"]);
    expect(groepen[0].events.map(e => e.titel)).toEqual(["b", "e-0030"]);
    expect(groepen[1].events.map(e => e.titel)).toEqual(["d-2330", "c", "a"]);
  });
});

describe("filterOpCategorie", () => {
  it("alles laat alles door; categorie filtert", () => {
    const events = [ev({ categorie: "werkplaats" }), ev({ categorie: "verkoop", type: "verkocht" })];
    expect(filterOpCategorie(events, "alles")).toHaveLength(2);
    expect(filterOpCategorie(events, "verkoop")).toHaveLength(1);
    expect(filterOpCategorie(events, "import")).toHaveLength(0);
  });
});

describe("dagenTussen", () => {
  it("telt hele NL-kalenderdagen", () => {
    expect(dagenTussen("2026-09-01T10:00:00Z", "2026-09-10T10:00:00Z")).toBe(9);
    expect(dagenTussen("2026-09-10T10:00:00Z", "2026-09-10T11:00:00Z")).toBe(0);
  });
});
