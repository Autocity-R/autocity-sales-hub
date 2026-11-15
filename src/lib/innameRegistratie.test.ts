import { describe, it, expect } from "vitest";
import { toAantal, toggleAantal, formatSleutelsLaadkabels, formatRegistratie, laadkabelLabel } from "./innameRegistratie";

describe("inname-registratie laadkabels", () => {
  it("alleen 1 of 2 is geldig, de rest is leeg", () => {
    expect(toAantal(1)).toBe(1);
    expect(toAantal(2)).toBe(2);
    expect(toAantal(3)).toBeNull();
    expect(toAantal(null)).toBeNull();
  });
  it("nogmaals klikken op dezelfde knop maakt het weer leeg", () => {
    expect(toggleAantal(null, 1)).toBe(1);
    expect(toggleAantal(1, 2)).toBe(2);
    expect(toggleAantal(2, 2)).toBeNull();
  });
  it("kaartweergave toont alleen wat ingevuld is", () => {
    expect(formatSleutelsLaadkabels(2, 1)).toBe("🔑 2 · 🔌 1");
    expect(formatSleutelsLaadkabels(2, null)).toBe("🔑 2");
    expect(formatSleutelsLaadkabels(null, 2)).toBe("🔌 2");
    expect(formatSleutelsLaadkabels(null, null)).toBe("");
  });
  it("registratieregel in NL-tijd", () => {
    expect(formatRegistratie("Peter Moesman", "2026-11-18T08:05:00Z")).toBe("geregistreerd door Peter Moesman op 18-11-2026 09:05");
    expect(formatRegistratie(null, null)).toBe("");
  });
  it("enkelvoud/meervoud", () => {
    expect(laadkabelLabel(1)).toBe("1 laadkabel");
    expect(laadkabelLabel(2)).toBe("2 laadkabels");
  });
});
