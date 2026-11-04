import { describe, expect, it } from "vitest";
import { canEditContact } from "./customerPermissions";
import { canAccessRoute } from "./routeAccess";

describe("OD customer access", () => {
  it("allows list and details", () => {
    expect(canAccessRoute("operationeel_directeur", "/customers").allowed).toBe(true);
    expect(canAccessRoute("operationeel_directeur", "/customers/123").allowed).toBe(true);
  });
  it.each(["b2b", "b2c"])("OD edits %s like aftersales", type => {
    expect(canEditContact("operationeel_directeur", type)).toBe(true);
    expect(canEditContact("aftersales_manager", type)).toBe(true);
  });
  it.each(["supplier", "transporter"])("OD and aftersales cannot edit %s", type => {
    expect(canEditContact("operationeel_directeur", type)).toBe(false);
    expect(canEditContact("aftersales_manager", type)).toBe(false);
  });
});