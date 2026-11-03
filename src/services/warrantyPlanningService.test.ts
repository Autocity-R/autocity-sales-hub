import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { createWarrantyWorkOrder } from "./warrantyPlanningService";

const input = {
  claimId: "manual-claim", vehicleId: null, description: "  Garantie reparatie  ",
  plannedAt: new Date("2026-12-01T09:00:00Z"), branch: "rotterdam", createdBy: "planner",
};

describe("handmatige garantieclaim inplannen", () => {
  beforeEach(() => rpc.mockReset());
  it("plant een claim zonder voertuig via de atomische koppeling", async () => {
    rpc.mockResolvedValue({ data: "order-1", error: null });
    expect(await createWarrantyWorkOrder(input)).toBe("order-1");
    expect(rpc).toHaveBeenCalledWith("garantie_werkorder_inplannen", {
      p_claim_id: "manual-claim", p_description: "Garantie reparatie",
      p_planned_at: "2026-12-01T09:00:00.000Z", p_assigned_to: null,
      p_is_rush: false, p_customer_id: null,
    });
  });
  it("geeft de expliciet geselecteerde later toegevoegde CRM-klant door", async () => {
    rpc.mockResolvedValue({ data: "order-2", error: null });
    await createWarrantyWorkOrder({ ...input, customerId: "selected-customer" });
    expect(rpc.mock.calls[0][1].p_customer_id).toBe("selected-customer");
  });
  it("toont een opslagfout en meldt geen succesvol ingeplande order", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("Geen toestemming") });
    await expect(createWarrantyWorkOrder(input)).rejects.toThrow("Geen toestemming");
  });
  it("weigert een ongeldige datum zonder opslag", async () => {
    await expect(createWarrantyWorkOrder({ ...input, plannedAt: new Date("invalid") })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});