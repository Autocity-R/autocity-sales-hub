import { describe, it, expect } from "vitest";
import { secondsWithinWork, autoPauseAt, DEFAULT_SCHEDULE, placeBackward, nlToUtc } from "./workHours";
import { orderTime, fairSeconds } from "./performanceGroups";
import { poetserMayTogglePause } from "@/components/werkplaats/workOrderPause";

const nl = (s: string) => { const [d, t] = s.split(" "); const [y, m, dd] = d.split("-").map(Number); return nlToUtc(y, m, dd, t); };
const h = (sec: number) => Math.round((sec / 3600) * 100) / 100;

describe("afknippen op werktijden (ma–za 08–18 NL)", () => {
  it("timer over de nacht telt alleen tot 18:00 en vanaf 08:00", () => {
    // do 24-9 11:37 → vr 25-9 07:51 : 6u23 op donderdag, 0 op vrijdag
    expect(h(secondsWithinWork(nl("2026-09-24 11:37"), nl("2026-09-25 07:51")))).toBe(6.38);
    expect(h(secondsWithinWork(nl("2026-09-24 17:00"), nl("2026-09-25 09:00")))).toBe(2);
  });
  it("zondag telt niet, zaterdag wel", () => {
    expect(secondsWithinWork(nl("2026-09-27 09:00"), nl("2026-09-27 17:00"))).toBe(0);
    expect(h(secondsWithinWork(nl("2026-09-26 09:00"), nl("2026-09-26 17:00")))).toBe(8);
    // za 17:00 → ma 09:00 = 1u za + 1u ma
    expect(h(secondsWithinWork(nl("2026-09-26 17:00"), nl("2026-09-28 09:00")))).toBe(2);
  });
  it("wintertijd (CET) klopt ook", () => {
    expect(h(secondsWithinWork(nl("2026-11-02 07:00"), nl("2026-11-02 19:00")))).toBe(10);
  });
  it("pauze midden in: eerdere sessie in werktijd, laatste sessie exact", () => {
    // gewerkt 09–10, pauze, hervat 14:00, klaar 15:00 → work_seconds 7200, paused_seconds 3600
    const o = { id: "p", vehicle_id: "v", discipline: "spuit", status: "goedgekeurd", created_at: "", work_seconds: 7200, paused_seconds: 3600,
      started_at: new Date(nl("2026-09-24 14:00")).toISOString(), finished_at: new Date(nl("2026-09-24 15:00")).toISOString() };
    expect(orderTime(o)).toEqual({ registered: 7200, counted: 7200, clipped: 0 });
    // eerdere sessie wordt achterwaarts in werktijd geplaatst (niet in de nacht)
    const back = placeBackward(nl("2026-09-24 09:00"), 7200);
    expect(back[0]).toEqual([nl("2026-09-24 08:00"), nl("2026-09-24 09:00")]);
    expect(back[1]).toEqual([nl("2026-09-23 17:00"), nl("2026-09-23 18:00")]);
  });
  it("Kia-geval: 18,2 u geregistreerd → alleen binnen werktijd", () => {
    const o = { id: "k", vehicle_id: "v", discipline: "spuit", status: "afgerond", created_at: "", paused_seconds: 0,
      started_at: "2026-09-24T11:37:42Z", finished_at: "2026-09-25T05:51:48Z", work_seconds: 65646 };
    const t = orderTime(o);
    expect(h(t.registered)).toBe(18.24);
    expect(h(t.counted)).toBe(2.37); // 13:37:42 → 18:00 NL
    expect(fairSeconds([o])).toBeCloseTo(t.counted, 0);
  });
});

describe("auto-pauze-tijdstip (spiegel van werkplaats_auto_pauze)", () => {
  it("werkdag: eindtijd van de startdag", () => {
    expect(autoPauseAt(nl("2026-09-28 16:00"))).toBe(nl("2026-09-28 18:00"));
    expect(autoPauseAt(nl("2026-09-26 07:30"))).toBe(nl("2026-09-26 18:00"));
  });
  it("gestart buiten werktijd of op zondag: direct (niets extra)", () => {
    expect(autoPauseAt(nl("2026-09-28 19:00"))).toBe(nl("2026-09-28 19:00"));
    expect(autoPauseAt(nl("2026-10-04 10:00"))).toBe(nl("2026-10-04 10:00"));
  });
  it("volgt de instelling", () => {
    const s = { ...DEFAULT_SCHEDULE, 1: { enabled: true, start: "07:00", end: "16:30" } };
    expect(autoPauseAt(nl("2026-09-28 10:00"), s)).toBe(nl("2026-09-28 16:30"));
  });
});

describe("poets-pauze-rechten", () => {
  const w = { discipline: "poets", status: "bezig", assigned_to: "u1" };
  it("eigen beurt pauzeren/hervatten mag", () => {
    expect(poetserMayTogglePause("poetser", w, "u1")).toBe(true);
    expect(poetserMayTogglePause("poetser", { ...w, status: "gepauzeerd" }, "u1")).toBe(true);
  });
  it("andermans beurt, andere discipline of afgeronde beurt niet", () => {
    expect(poetserMayTogglePause("poetser", w, "u2")).toBe(false);
    expect(poetserMayTogglePause("poetser", { ...w, discipline: "spuit" }, "u1")).toBe(false);
    expect(poetserMayTogglePause("poetser", { ...w, status: "goedgekeurd" }, "u1")).toBe(false);
    expect(poetserMayTogglePause("monteur", w, "u1")).toBe(false);
  });
});
