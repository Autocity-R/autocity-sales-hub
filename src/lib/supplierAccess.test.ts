import { describe, it, expect } from "vitest";
import { canViewSuppliers, toEffectiveRole, filterContactsForRole } from "./supplierAccess";

describe("leveranciers zien", () => {
  it.each(["owner", "admin", "manager", "operationeel_directeur", "administratie", "inkoper"])(
    "%s ziet leveranciers",
    (role) => expect(canViewSuppliers(role)).toBe(true),
  );

  it.each(["verkoper", "aftersales_manager", "werkplaats_chef", "monteur", "poetser", "operationeel", "user", null])(
    "%s ziet geen leveranciers",
    (role) => expect(canViewSuppliers(role)).toBe(false),
  );
});

describe("inkoper heeft alle verkoperrechten", () => {
  it("inkoper geldt als verkoper", () => expect(toEffectiveRole("inkoper")).toBe("verkoper"));
  it("andere rollen blijven gelijk", () => {
    expect(toEffectiveRole("verkoper")).toBe("verkoper");
    expect(toEffectiveRole("owner")).toBe("owner");
    expect(toEffectiveRole(null)).toBe(null);
  });
});

describe("alle contacten", () => {
  const contacts = [{ type: "supplier" }, { type: "b2b" }, { type: "b2c" }, { type: "transporter" }];
  it("verkoper krijgt geen leveranciers in de lijst", () => {
    expect(filterContactsForRole(contacts, "verkoper").map((c) => c.type)).toEqual(["b2b", "b2c", "transporter"]);
  });
  it("inkoper ziet de leveranciers wel", () => {
    expect(filterContactsForRole(contacts, "inkoper")).toHaveLength(4);
  });
});
