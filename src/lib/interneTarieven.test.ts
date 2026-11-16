import { describe, it, expect } from "vitest";
import { deelPrijs, spuitOrderPrijs, poetsPrijs, isVelg } from "./interneTarieven";

describe("interne tarieven", () => {
  it("velg kost intern € 100 ex btw vanaf 16-11-2026", () => {
    expect(deelPrijs("Velg R voor", "2026-11-16")).toBe(100);
    expect(deelPrijs("L velg achter", "2026-12-01")).toBe(100);
  });
  it("velg vóór 16-11-2026 bleef € 300", () => {
    expect(deelPrijs("Velg R voor", "2026-11-15")).toBe(300);
    // 15-11 23:30 NL-tijd is nog de oude dag
    expect(deelPrijs("Velg R voor", "2026-11-15T22:30:00Z")).toBe(300);
    expect(deelPrijs("Velg R voor", "2026-11-15T23:30:00Z")).toBe(100);
  });
  it("andere delen blijven € 300", () => {
    expect(deelPrijs("Motorkap", "2026-11-16")).toBe(300);
    expect(isVelg("Bumper voor")).toBe(false);
  });
  it("spuit-order: som per deel (bumper + velg = € 400)", () => {
    expect(spuitOrderPrijs({ parts: ["Bumper voor", "Velg L voor"] }, "2026-11-16")).toBe(400);
    expect(spuitOrderPrijs({ part: "Velg R achter", parts: [] }, "2026-11-16")).toBe(100);
  });
  it("poetsbeurt € 100 ex / € 121 incl. vanaf 16-11-2026, daarvoor € 82,64 / € 100", () => {
    expect(poetsPrijs("2026-11-16")).toEqual({ excl: 100, incl: 121 });
    expect(poetsPrijs("2026-11-15")).toEqual({ excl: 82.64, incl: 100 });
  });
});
