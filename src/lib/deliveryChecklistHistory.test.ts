import { describe, it, expect } from "vitest";
import { checklistHistory } from "./deliveryChecklistHistory";

const D = "2026-09-10T12:00:00Z";
describe("checklistHistory", () => {
  it("telt alleen punten die bij aflevering bestonden en toen afgevinkt waren", () => {
    const r = checklistHistory([
      { id: "a", description: "Poetsen", completed: true, completedAt: "2026-09-09T10:00:00Z", createdAt: "2026-09-01T00:00:00Z" },
      { id: "b", description: "APK", completed: false, createdAt: "2026-09-01T00:00:00Z" },
      { id: "c", description: "Na aflevering afgevinkt", completed: true, completedAt: "2026-09-12T10:00:00Z", createdAt: "2026-09-01T00:00:00Z" },
      { id: "d", description: "Later toegevoegd", completed: false, createdAt: "2026-09-20T00:00:00Z" },
    ], D);
    expect(r.totalAtDelivery).toBe(3);
    expect(r.percentAtDelivery).toBe(33);
    expect(r.rows.find(x => x.id === "c")!.doneAtDelivery).toBe(false);
    expect(r.rows.find(x => x.id === "d")!.existedAtDelivery).toBe(false);
  });
  it("lege of ongeldige checklist", () => {
    expect(checklistHistory(null, D).percentAtDelivery).toBeNull();
  });
  it("QR-afvinken zonder naam toont 'Medewerker (via QR)'", () => {
    expect(checklistHistory([{ completed: true, completedVia: "qr" }], D).rows[0].completedByName).toBe("Medewerker (via QR)");
  });
});
