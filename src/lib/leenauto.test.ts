import { describe, it, expect } from "vitest";
import { canAccessRoute, canReadLeenautoRole, canWriteLeenautoRole } from "@/lib/routeAccess";
import { fromLocalInput, isTeLaat, plateKey, toLocalInput } from "@/services/leenautoService";

describe("leenauto rechten", () => {
  it("administratie en directeur lezen, maar lenen niet uit", () => {
    for (const r of ["administratie", "operationeel_directeur"]) {
      expect(canReadLeenautoRole(r)).toBe(true);
      expect(canWriteLeenautoRole(r)).toBe(false);
    }
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
