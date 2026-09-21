import { describe, it, expect } from "vitest";
import {
  IMPORT_STATUS_LABELS,
  IMPORT_STATUS_OPTIONS,
  IMPORT_STATUS_RANK,
  getImportStatusLabel,
  importStatusBadgeClass,
} from "./importStatus";

describe("importStatus", () => {
  it("heeft Nederlandse labels voor de drie uitzonderingsstatussen", () => {
    expect(IMPORT_STATUS_LABELS.bestanden_gevraagd).toBe("Verzoek juiste bestanden");
    expect(IMPORT_STATUS_LABELS.keuringsafspraak).toBe("Keuringsafspraak (steekproef)");
    expect(IMPORT_STATUS_LABELS.toonplicht).toBe("Toonplicht");
  });

  it("valt terug op de ruwe waarde bij onbekende status", () => {
    expect(getImportStatusLabel("iets_nieuws")).toBe("iets nieuws");
    expect(getImportStatusLabel(null)).toBe("—");
    expect(getImportStatusLabel("toonplicht")).toBe("Toonplicht");
  });

  it("plaatst de uitzonderingen op de juiste plek in de rangorde", () => {
    expect(IMPORT_STATUS_RANK.aanvraag_ontvangen).toBeLessThan(IMPORT_STATUS_RANK.bestanden_gevraagd);
    expect(IMPORT_STATUS_RANK.keuringsafspraak).toBeLessThan(IMPORT_STATUS_RANK.goedgekeurd);
    expect(IMPORT_STATUS_RANK.goedgekeurd).toBeLessThan(IMPORT_STATUS_RANK.toonplicht);
    expect(IMPORT_STATUS_RANK.toonplicht).toBeLessThan(IMPORT_STATUS_RANK.bpm_betaald);
  });

  it("zet de keuzelijst in flow-volgorde", () => {
    expect(IMPORT_STATUS_OPTIONS).toEqual([
      "niet_aangemeld",
      "aanvraag_ontvangen",
      "bestanden_gevraagd",
      "keuringsafspraak",
      "goedgekeurd",
      "toonplicht",
      "bpm_betaald",
      "ingeschreven",
    ]);
    const ranks = IMPORT_STATUS_OPTIONS.map((s) => IMPORT_STATUS_RANK[s]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("geeft amber voor acties en rood voor toonplicht", () => {
    expect(importStatusBadgeClass("bestanden_gevraagd")).toContain("amber");
    expect(importStatusBadgeClass("keuringsafspraak")).toContain("amber");
    expect(importStatusBadgeClass("toonplicht")).toContain("red");
    expect(importStatusBadgeClass("goedgekeurd")).toBe("");
  });
});
