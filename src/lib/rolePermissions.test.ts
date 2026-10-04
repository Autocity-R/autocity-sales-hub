import { describe, it, expect } from "vitest";
import {
  canManageChecklistsRole, canAssignTasksRole, canManageWorkOrdersRole, canPlanWorkOrdersRole,
} from "./routeAccess";

const ALL = ["admin","owner","manager","verkoper","operationeel","user","aftersales_manager","schadeherstel",
  "monteur","werkplaats_chef","uitdeuker_extern","operationeel_directeur","poetser","administratie", null];

describe("rechten operationeel_directeur (bouwstap 2E)", () => {
  it("directeur mag checklist beheren, taken toewijzen en werkorders plannen", () => {
    expect(canManageChecklistsRole("operationeel_directeur")).toBe(true);
    expect(canAssignTasksRole("operationeel_directeur")).toBe(true);
    expect(canPlanWorkOrdersRole("operationeel_directeur")).toBe(true);
  });
  it("directeur mag werkorders NIET beheren/verwijderen", () => {
    expect(canManageWorkOrdersRole("operationeel_directeur")).toBe(false);
  });
  it("andere rollen: exact dezelfde rechten als voorheen", () => {
    const before = ["admin","owner","manager","verkoper","aftersales_manager","werkplaats_chef"];
    for (const r of ALL) {
      if (r === "operationeel_directeur") continue;
      expect(canManageChecklistsRole(r)).toBe(before.includes(r as string));
      expect(canAssignTasksRole(r)).toBe(before.includes(r as string));
      expect(canPlanWorkOrdersRole(r)).toBe(["admin","owner","manager","aftersales_manager","werkplaats_chef"].includes(r as string));
    }
  });
});

import { canCancelWorkOrdersRole, canManagePoetsRole, canApproveWorkOrdersRole } from "./routeAccess";

describe("bouwstap 7: directeur annuleren / poets beheren / goedkeuren", () => {
  const MANAGERS = ["admin","owner","manager","aftersales_manager","werkplaats_chef"];
  it("directeur mag annuleren, poets ordenen/annuleren en goedkeuren", () => {
    expect(canCancelWorkOrdersRole("operationeel_directeur")).toBe(true);
    expect(canManagePoetsRole("operationeel_directeur")).toBe(true);
    expect(canApproveWorkOrdersRole("operationeel_directeur")).toBe(true);
  });
  it("directeur mag NIET hard verwijderen (beheren)", () => {
    expect(canManageWorkOrdersRole("operationeel_directeur")).toBe(false);
  });
  it("andere rollen krijgen er niets bij", () => {
    for (const r of ALL) {
      if (r === "operationeel_directeur") continue;
      const expected = MANAGERS.includes(r as string);
      expect(canCancelWorkOrdersRole(r)).toBe(expected);
      expect(canManagePoetsRole(r)).toBe(expected);
      expect(canApproveWorkOrdersRole(r)).toBe(expected);
    }
  });
  it("poetser kan niets hiervan", () => {
    expect(canManagePoetsRole("poetser")).toBe(false);
  });
});
