import { describe, it, expect } from "vitest";
import { canAccessRoute, canReadLeenautoRole, canWriteLeenautoRole, LEENAUTO_WRITE_ROLES, LEENAUTO_READ_ROLES } from "@/lib/routeAccess";
import { fromLocalInput, isTeLaat, plateKey, toLocalInput } from "@/services/leenautoService";

describe("leenauto rechten", () => {
  it("administratie leest alleen", () => {
    expect(canReadLeenautoRole("administratie")).toBe(true);
    expect(canWriteLeenautoRole("administratie")).toBe(false);
  });
  it("directeur leest en leent uit, opent beheer, historie en werkplaats-agenda", () => {
    expect(canReadLeenautoRole("operationeel_directeur")).toBe(true);
    expect(canWriteLeenautoRole("operationeel_directeur")).toBe(true);
    for (const u of ["/loan-cars", "/loan-cars/historie", "/werkplaats/agenda"])
      expect(canAccessRoute("operationeel_directeur", u).allowed).toBe(true);
  });
  it("overige rollen: leenautorechten ongewijzigd", () => {
    expect([...LEENAUTO_WRITE_ROLES].sort()).toEqual(["admin","aftersales_manager","manager","operationeel","operationeel_directeur","owner","verkoper","werkplaats_chef"]);
    expect([...LEENAUTO_READ_ROLES].sort()).toEqual(["admin","administratie","aftersales_manager","manager","operationeel","operationeel_directeur","owner","verkoper","werkplaats_chef"]);
  });
  it("aftersales, chef en owner mogen uitlenen", () => {
    for (const r of ["aftersales_manager", "werkplaats_chef", "owner", "admin", "manager", "verkoper"]) {
      expect(canWriteLeenautoRole(r)).toBe(true);
    }
  });
  it("monteur/poetser/uitdeuker hebben geen toegang", () => {
    for (const r of ["monteur", "poetser", "uitdeuker_extern", "schadeherstel"]) {
      expect(canReadLeenautoRole(r)).toBe(false);
      expect(canWriteLeenautoRole(r)).toBe(false);
    }
  });
  it("administratie mag alleen de historie-route, niet beheer", () => {
    expect(canAccessRoute("administratie", "/loan-cars/historie").allowed).toBe(true);
    expect(canAccessRoute("administratie", "/loan-cars").allowed).toBe(false);
  });
});

describe("leenauto helpers", () => {
  it("NL-tijd heen en terug (zomertijd)", () => {
    const d = fromLocalInput("2026-07-01T10:00")!;
    expect(d.toISOString()).toBe("2026-07-01T08:00:00.000Z");
    expect(toLocalInput(d)).toBe("2026-07-01T10:00");
  });
  it("NL-tijd wintertijd", () => {
    expect(fromLocalInput("2026-12-01T10:00")!.toISOString()).toBe("2026-12-01T09:00:00.000Z");
  });
  it("kenteken zonder streepjes", () => {
    expect(plateKey("v-335 gd")).toBe(plateKey("V335GD"));
  });
  it("te laat alleen als open en verwacht voorbij", () => {
    const now = new Date("2026-09-25T10:00:00Z");
    expect(isTeLaat({ verwacht_terug_op: "2026-09-25T09:00:00Z", ingeleverd_op: null }, now)).toBe(true);
    expect(isTeLaat({ verwacht_terug_op: "2026-09-25T09:00:00Z", ingeleverd_op: "2026-09-25T09:30:00Z" }, now)).toBe(false);
    expect(isTeLaat({ verwacht_terug_op: null, ingeleverd_op: null }, now)).toBe(false);
  });
});
