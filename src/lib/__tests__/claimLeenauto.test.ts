import { describe, it, expect } from "vitest";
import { mapClaimUitleningen, magInnemenVanuitClaim, claimBewerkPatch } from "../claimLeenauto";

const u = (id: string, claim: string | null, uit: string, terug: string | null, kenteken = "JSF-14-P") => ({
  id, warranty_claim_id: claim, uitgeleend_op: uit, ingeleverd_op: terug, kenteken,
});

describe("mapClaimUitleningen", () => {
  it("toont alleen eigen uitleningen, nooit die van een andere claim op dezelfde pool-auto", () => {
    const rows = [u("a", "c131", "2026-10-08T10:00Z", "2026-10-20T10:00Z"), u("b", "c108", "2026-10-30T10:00Z", null)];
    const s = mapClaimUitleningen("c131", rows, { loanCarId: "pool1", loanCarAssigned: true, kenteken: "JSF-14-P" });
    expect(s.soort).toBe("gehad");
    expect(s.label).toBe("Gehad · JSF-14-P");
  });
  it("open + gesloten, nieuwste bovenaan", () => {
    const rows = [u("g", "c108", "2026-10-02T10:00Z", "2026-10-30T09:00Z", "NH-154-K"), u("o", "c108", "2026-10-30T10:00Z", null)];
    const s = mapClaimUitleningen("c108", rows);
    expect(s.soort).toBe("open");
    if (s.soort === "open") { expect(s.open.id).toBe("o"); expect(s.gesloten.map((x) => x.id)).toEqual(["g"]); }
    expect(s.label).toBe("Uitgeleend · JSF-14-P");
  });
  it("oude loan_car_id zonder uitlening → (oud)", () => {
    const s = mapClaimUitleningen("c39", [u("x", "other", "2026-11-01T10:00Z", null, "HVR")], { loanCarId: "p", kenteken: "AB-12-CD" });
    expect(s).toEqual({ soort: "oud", kenteken: "AB-12-CD", label: "AB-12-CD (oud)" });
  });
  it("niets → geen", () => {
    expect(mapClaimUitleningen("c1", []).soort).toBe("geen");
  });
});

describe("magInnemenVanuitClaim", () => {
  it("weigert uitlening van een andere claim", () => {
    expect(magInnemenVanuitClaim({ warranty_claim_id: "c108" }, "c131")).toBe(false);
    expect(magInnemenVanuitClaim({ warranty_claim_id: null }, "c131")).toBe(false);
    expect(magInnemenVanuitClaim(null, "c131")).toBe(false);
  });
  it("staat eigen uitlening toe", () => {
    expect(magInnemenVanuitClaim({ warranty_claim_id: "c108" }, "c108")).toBe(true);
  });
});

describe("claimBewerkPatch", () => {
  it("stuurt nooit leenautovelden mee, alleen gewijzigde bewerkvelden", () => {
    const orig = { status: "actief", priority: "normaal", problemDescription: "a", loanCarId: "p1", loanCarAssigned: true };
    const edit = { ...orig, status: "in_behandeling", loanCarId: "oud", loanCarAssigned: false };
    const p = claimBewerkPatch(orig as any, edit as any);
    expect(p).toEqual({ status: "in_behandeling" });
    expect("loanCarId" in p).toBe(false);
    expect("loanCarAssigned" in p).toBe(false);
  });
});
