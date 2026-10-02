import { describe, it, expect } from "vitest";
import { spuitActionFor } from "./spuitActions";

const me = "me", other = "other";
describe("spuitActionFor", () => {
  it("vrije klus → start", () => expect(spuitActionFor({ status: "ingepland", assigned_to: null }, me)).toBe("start"));
  it("klus van collega ingepland → geen", () => expect(spuitActionFor({ status: "ingepland", assigned_to: other }, me)).toBe("geen"));
  it("eigen lopend → pauze/klaar", () => expect(spuitActionFor({ status: "bezig", assigned_to: me }, me)).toBe("pauze_klaar"));
  it("collega lopend → geen", () => expect(spuitActionFor({ status: "bezig", assigned_to: other }, me)).toBe("geen"));
  it("eigen gepauzeerd → verder", () => expect(spuitActionFor({ status: "gepauzeerd", assigned_to: me }, me)).toBe("verder"));
  it("collega gepauzeerd → overnemen", () => expect(spuitActionFor({ status: "gepauzeerd", assigned_to: other }, me)).toBe("overnemen"));
  it("afgerond → geen", () => expect(spuitActionFor({ status: "afgerond", assigned_to: me }, me)).toBe("geen"));
});
