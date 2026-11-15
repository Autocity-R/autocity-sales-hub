import { describe, it, expect } from "vitest";
import { werkplaatsStatus, laatsteOrderPerClaim, matchWerkplaatsFilter, AFRONDEN_LABEL, type ClaimWerkorder } from "./claimWerkplaatsStatus";

const base = (o: Partial<ClaimWerkorder>): ClaimWerkorder => ({
  id: "w", warranty_claim_id: "c1", status: "ingepland", created_at: "2026-11-10T08:00:00Z",
  planned_at: null, started_at: null, paused_at: null, pause_reason: null,
  finished_at: null, approved_at: null, assigned_to: null, assigned_name: null, ...o,
});
// wo 18-11-2026, wintertijd (UTC+1)
const NU = new Date("2026-11-18T12:00:00Z");

describe("werkplaatsstatus bij garantieclaims", () => {
  it("ingepland toont dag, datum en NL-tijd plus monteur", () => {
    const s = werkplaatsStatus(base({ planned_at: "2026-11-19T08:00:00Z", assigned_name: "Jan Monteur" }), true, NU);
    expect(s.label).toBe("Ingepland do 19-11 09:00 · Jan Monteur");
    expect(s.teLaat).toBe(false);
  });
  it("te laat als planned_at voorbij is en de order niet gestart is", () => {
    const s = werkplaatsStatus(base({ planned_at: "2026-11-18T08:00:00Z" }), true, NU);
    expect(s.teLaat).toBe(true);
    expect(s.label).toBe("Ingepland wo 18-11 09:00 · te laat");
  });
  it("bezig vandaag: alleen tijd + naam", () => {
    const s = werkplaatsStatus(base({ status: "bezig", started_at: "2026-11-18T09:12:00Z", assigned_name: "Piet" }), true, NU);
    expect(s.label).toBe("Bezig sinds 10:12 · Piet");
  });
  it("bezig sinds een eerdere dag: met datum", () => {
    const s = werkplaatsStatus(base({ status: "bezig", started_at: "2026-11-17T09:12:00Z" }), true, NU);
    expect(s.label).toBe("Bezig sinds di 17-11 10:12");
  });
  it("gepauzeerd met reden", () => {
    expect(werkplaatsStatus(base({ status: "gepauzeerd", pause_reason: "Wacht op onderdeel" }), true, NU).label)
      .toBe("Gepauzeerd · Wacht op onderdeel");
  });
  it("afgerond = wacht op goedkeuring", () => {
    expect(werkplaatsStatus(base({ status: "afgerond" }), true, NU).label).toBe("Klaar — wacht op goedkeuring");
  });
  it("goedgekeurd = werk gereed met datum; bij open claim het afronden-signaal", () => {
    const s = werkplaatsStatus(base({ status: "goedgekeurd", approved_at: "2026-11-16T23:30:00Z" }), true, NU);
    expect(s.label).toBe("Werk gereed 17-11");
    expect(s.afrondenSignaal).toBe(true);
    expect(AFRONDEN_LABEL).toBe("Werk klaar — claim afronden?");
  });
  it("goedgekeurd bij opgeloste claim: geen afronden-signaal", () => {
    expect(werkplaatsStatus(base({ status: "goedgekeurd", approved_at: "2026-11-16T10:00:00Z" }), false, NU).afrondenSignaal).toBe(false);
  });
  it("geen werkorder: 'Niet ingepland' bij open claim, niets bij gesloten claim", () => {
    expect(werkplaatsStatus(null, true, NU).label).toBe("Niet ingepland");
    expect(werkplaatsStatus(null, false, NU).label).toBe("");
  });
});

describe("meest recente niet-geannuleerde order per claim", () => {
  it("negeert geannuleerd en kiest de nieuwste", () => {
    const m = laatsteOrderPerClaim([
      base({ id: "oud", created_at: "2026-11-01T08:00:00Z", status: "goedgekeurd" }),
      base({ id: "nieuw", created_at: "2026-11-05T08:00:00Z", status: "ingepland" }),
      base({ id: "geannuleerd", created_at: "2026-11-09T08:00:00Z", status: "geannuleerd" }),
    ]);
    expect(m.get("c1")?.id).toBe("nieuw");
  });
});

describe("filter werkplaatsstatus", () => {
  it("elke filter laat alleen de bijbehorende status door", () => {
    expect(matchWerkplaatsFilter("niet_ingepland", "niet_ingepland")).toBe(true);
    expect(matchWerkplaatsFilter("ingepland", "niet_ingepland")).toBe(false);
    expect(matchWerkplaatsFilter("ingepland", "ingepland")).toBe(true);
    expect(matchWerkplaatsFilter("gepauzeerd", "bezig")).toBe(true);
    expect(matchWerkplaatsFilter("afgerond", "wacht")).toBe(true);
    expect(matchWerkplaatsFilter("goedgekeurd", "wacht")).toBe(false);
    expect(matchWerkplaatsFilter("goedgekeurd", "gereed")).toBe(true);
    expect(matchWerkplaatsFilter("bezig", "alle")).toBe(true);
  });
});
