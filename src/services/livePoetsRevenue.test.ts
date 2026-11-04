import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { omzetStats, poetsStats, performanceAansluiting, type RapRaw } from "./rapportageService";
import { kernCijfers, employeeKpis, branchStats, type DirectieRaw } from "./directieService";
import type { OmzetBron } from "./omzetService";
import { liveOmzetRegels } from "@/lib/omzet";

function fixture(month: number, count: number, invoiced: boolean) {
  const from = new Date(2026, month - 1, 1), to = new Date(2026, month, 1);
  const day = `2026-${String(month).padStart(2, "0")}-04`;
  const beurten = Array.from({ length: count }, (_, i) => ({ id: `wo${i}`, day, assigned_to: "poetser", vehicle_id: null, branch: "rotterdam", intern: true }));
  const generated = liveOmzetRegels([], beurten, new Set(), day.slice(0, 7) + "-01", "2027-01-01");
  const regels = invoiced ? generated.map(r => ({ ...r, invoice_id: "monthly", invoice_kind: "poets_intern", subtotal: Math.round(count * 82.64 * 100) / 100 })) : [];
  const bron: OmzetBron = { van: day.slice(0, 7) + "-01", tot: "2027-01-01", regels, poetsBeurten: beurten, poetsGefactureerd: new Set(invoiced ? beurten.map(b => b.id) : []), links: [], externZonderFactuur: [] };
  const orders = beurten.map(b => ({ id: b.id, discipline: "poets", status: "afgerond", assigned_to: b.assigned_to, finished_at: `${day}T10:00:00Z`, approved_at: null, created_at: "2025-01-01T10:00:00Z", work_seconds: 0, rejected_count: 0 }));
  const raw = { bron, from, to, prevFrom: from, prevTo: to, trendFrom: from, trendTo: to, sixM: from, orders, profiles: [{ id: "poetser", first_name: "TEST", last_name: "Poetser", poetser_type: null }], vehicleInfo: {} };
  return { rap: raw as unknown as RapRaw, directie: raw as unknown as DirectieRaw, from, to };
}

describe("shared screen revenue calculations", () => {
  it.each([
    [9, 67, true, 5536.88], [10, 100, true, 8264], [11, 10, false, 826.4],
  ] as const)("month %i matches reports/cockpit/employee allocation", (month, count, invoiced, expected) => {
    const { rap, directie, from, to } = fixture(month, count, invoiced);
    const stats = omzetStats(rap);
    expect(stats.poets.total).toBe(expected);
    expect(stats.totaal).toBe(expected);
    expect(stats.trend[0].poets).toBe(expected);
    expect(stats.poetsGefactureerd).toBe(invoiced ? expected : 0);
    expect(stats.poetsOpen.bedrag).toBe(invoiced ? 0 : expected);
    expect(poetsStats(rap).revenueExcl).toBe(expected);
    expect(kernCijfers(directie, from, to).poets).toBe(expected);
    expect(branchStats(directie, from, to, "poets").internal).toBe(expected);
    expect(employeeKpis(directie)[0].revenue).toBe(expected);
    expect(performanceAansluiting(rap).totaal).toBe(expected);
    expect(performanceAansluiting(rap).sluit).toBe(true);
  });
});