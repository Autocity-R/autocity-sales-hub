import { describe, it, expect } from "vitest";
import { DEFAULT_SCHEDULE, nlToUtc } from "@/lib/workHours";
import { fairSeconds, fairSecondsByAssignee, secondsByPerson, uitvoerders, registeredSeconds, groupOrders, type TimedOrder } from "@/lib/performanceGroups";
import { usesTijdregels, fmtUren, urenPerPersoonLabel, samenMetLabel, attachTijdregels, type Tijdregel } from "@/lib/tijdregels";
import { overnameLabel } from "@/lib/overnames";
import { gewerktVandaagSeconden } from "@/lib/mijnUren";
import { mayTakeOver, werkorderActionFor } from "@/components/werkplaats/spuitActions";

const S = DEFAULT_SCHEDULE; // ma–za 08:00–18:00
const nl = (d: number, hhmm: string) => new Date(nlToUtc(2026, 11, d, hhmm)).toISOString(); // november 2026
const A = "monteur-a", B = "monteur-b";
const regel = (wo: string, user: string, s: string, e: string | null, vooraf = 0): Tijdregel =>
  ({ work_order_id: wo, user_id: user, gestart_op: s, gestopt_op: e, vooraf_seconden: vooraf });

/** Scenario bouwstap 17: A 09:00–10:00, B neemt over, 10:30–18:00 (auto-pauze), volgende dag 08:00–09:00 klaar. */
const scenario = (): TimedOrder => ({
  id: "wo1", vehicle_id: "v1", discipline: "werkplaats", status: "afgerond", assigned_to: B,
  work_seconds: 34200, created_at: nl(9, "08:00"), started_at: nl(10, "08:00"), finished_at: nl(10, "09:00"), paused_seconds: 30600,
  tijdregels: [
    regel("wo1", A, nl(9, "09:00"), nl(9, "10:00"), 0),
    regel("wo1", B, nl(9, "10:30"), nl(9, "18:00"), 3600),
    regel("wo1", B, nl(10, "08:00"), nl(10, "09:00"), 30600),
  ],
});

describe("uren per persoon met tijdregels", () => {
  it("scenario: A = 1u00, B = 7u30 + 1u00", () => {
    const per = secondsByPerson(scenario(), S);
    expect(per.get(A)).toBe(3600);
    expect(per.get(B)).toBe(8.5 * 3600);
  });
  it("na overnemen houdt A zijn uur (niet alles naar de uitvoerder)", () => {
    expect(fairSeconds([scenario()], S, A)).toBe(3600);
    expect(fairSeconds([scenario()], S, B)).toBe(30600);
    expect(fairSecondsByAssignee([scenario()], S)).toBe(34200);
  });
  it("order telt bij iedereen met een tijdregel; label 'samen met'", () => {
    expect(uitvoerders(scenario())).toEqual([A, B]);
    const nameOf = (id: string) => (id === A ? "Samsom Rusom" : "Dani Liekendiek");
    expect(samenMetLabel(uitvoerders(scenario()), A, nameOf)).toBe("samen met Dani");
    expect(urenPerPersoonLabel(secondsByPerson(scenario(), S), nameOf)).toBe("Samsom 1u00 · Dani 8u30");
  });
  it("afknippen op werktijd: regel die tot 20:00 doorliep telt tot 18:00", () => {
    const o: TimedOrder = { ...scenario(), tijdregels: [regel("wo1", B, nl(9, "16:00"), nl(9, "20:00"))] };
    expect(fairSeconds([o], S, B)).toBe(2 * 3600);
    expect(registeredSeconds(o, B)).toBe(4 * 3600);
  });
  it("interval-unie per persoon: overlappende orders van dezelfde persoon tellen één keer", () => {
    const o1: TimedOrder = { ...scenario(), id: "x1", tijdregels: [regel("x1", A, nl(11, "09:00"), nl(11, "11:00"))] };
    const o2: TimedOrder = { ...scenario(), id: "x2", tijdregels: [regel("x2", A, nl(11, "10:00"), nl(11, "12:00"))] };
    expect(fairSeconds([o1, o2], S, A)).toBe(3 * 3600);
    expect(fairSecondsByAssignee([o1, o2], S)).toBe(3 * 3600);
  });
  it("geen dubbeltelling tussen personen: verschillende personen tegelijk tellen elk hun eigen uren", () => {
    const o1: TimedOrder = { ...scenario(), id: "y1", assigned_to: A, tijdregels: [regel("y1", A, nl(11, "09:00"), nl(11, "11:00"))] };
    const o2: TimedOrder = { ...scenario(), id: "y2", assigned_to: B, tijdregels: [regel("y2", B, nl(11, "09:00"), nl(11, "11:00"))] };
    expect(fairSecondsByAssignee([o1, o2], S)).toBe(4 * 3600);
  });
  it("groepskaart van een medewerker toont alleen zijn eigen uren", () => {
    const g = groupOrders([scenario()], A);
    expect(g[0].fairSeconds).toBe(3600);
  });
});

describe("terugval zonder tijdregels (oude orders)", () => {
  const legacy: TimedOrder = {
    id: "old", vehicle_id: "v", discipline: "werkplaats", status: "goedgekeurd", assigned_to: B,
    work_seconds: 7200, created_at: nl(3, "08:00"), started_at: nl(3, "09:00"), finished_at: nl(3, "11:00"), paused_seconds: 0,
  };
  it("alle tijd naar assigned_to, zoals voorheen", () => {
    expect(usesTijdregels(legacy.tijdregels)).toBe(false);
    expect(uitvoerders(legacy)).toEqual([B]);
    expect(fairSeconds([legacy], S)).toBe(7200);
    expect(fairSecondsByAssignee([legacy], S)).toBe(7200);
    expect(secondsByPerson(legacy, S).get(B)).toBe(7200);
  });
  it("klus met tijd van vóór de livegang (vooraf_seconden > 0 op de eerste regel) telt op de oude manier", () => {
    const mixed: TimedOrder = { ...legacy, work_seconds: 10800, started_at: nl(3, "12:00"), finished_at: nl(3, "13:00"), paused_seconds: 7200,
      tijdregels: [regel("old", A, nl(3, "12:00"), nl(3, "13:00"), 7200)] };
    expect(usesTijdregels(mixed.tijdregels)).toBe(false);
    expect(uitvoerders(mixed)).toEqual([B]);
    expect(fairSecondsByAssignee([mixed], S)).toBe(10800);
  });
  it("attachTijdregels zonder regels verandert niets", () => {
    const xs = [{ ...legacy }];
    attachTijdregels(xs, []);
    expect(xs[0].tijdregels).toBeUndefined();
  });
});

describe("weergave", () => {
  it("fmtUren", () => {
    expect(fmtUren(4800)).toBe("1u20");
    expect(fmtUren(2700)).toBe("0u45");
    expect(fmtUren(3599)).toBe("1u00");
  });
  it("planningskaart: 'Samsom → Dani (overgenomen 14:32)'", () => {
    const names: Record<string, string> = { a: "Samsom Rusom", b: "Dani Liekendiek" };
    const nm = (id: string | null) => (id ? names[id] : "Niet toegewezen");
    const at = nl(16, "14:32");
    expect(overnameLabel([{ work_order_id: "w", van_user_id: "a", naar_user_id: "b", overgenomen_op: at }], nm, new Date(nl(16, "16:00"))))
      .toBe("Samsom → Dani (overgenomen 14:32)");
    expect(overnameLabel([{ work_order_id: "w", van_user_id: "a", naar_user_id: "b", overgenomen_op: at }], nm, new Date(nl(17, "09:00"))))
      .toBe("Samsom → Dani (overgenomen 16-11 14:32)");
    expect(overnameLabel([], nm)).toBeNull();
  });
});

describe("overnemen: wie mag het", () => {
  const paused = { status: "gepauzeerd", assigned_to: "collega", discipline: "werkplaats" };
  it("monteur bij gepauzeerde werkplaatsklus van collega → overnemen", () => expect(werkorderActionFor(paused, "me", "monteur")).toBe("overnemen"));
  it("poetser/verkoper → geen knop", () => {
    expect(werkorderActionFor(paused, "me", "poetser")).toBe("geen");
    expect(werkorderActionFor(paused, "me", "verkoper")).toBe("geen");
  });
  it("klus waar iemand aan werkt → geen knop", () => expect(werkorderActionFor({ ...paused, status: "bezig" }, "me", "monteur")).toBe("geen"));
  it("eigen gepauzeerde klus → verder", () => expect(werkorderActionFor({ ...paused, assigned_to: "me" }, "me", "monteur")).toBe("verder"));
  it("monteur mag geen schadeherstelklus overnemen; schadehersteller wel", () => {
    expect(mayTakeOver("monteur", "spuit")).toBe(false);
    expect(mayTakeOver("schadeherstel", "spuit")).toBe(true);
    expect(mayTakeOver("schadeherstel", "werkplaats")).toBe(false);
  });
});

describe("Mijn prestaties: gewerkt vandaag", () => {
  it("eigen regels van vandaag binnen werktijd; lopende regel tot nu; oude klus via work_seconds", () => {
    const regels = [
      regel("r1", A, nl(16, "09:00"), nl(16, "10:00")),
      regel("r2", A, nl(16, "11:00"), null),
      regel("r3", A, nl(14, "09:00"), nl(14, "10:00")), // andere dag
    ];
    const done = [{ id: "oud", work_seconds: 1800, finished_at: nl(16, "08:30"), approved_at: null }];
    expect(gewerktVandaagSeconden(done, regels, new Date(nl(16, "11:30")), S)).toBe(3600 + 1800 + 1800);
  });
});
