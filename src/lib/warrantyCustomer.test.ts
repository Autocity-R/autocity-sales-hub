import { describe, it, expect } from "vitest";
import { warrantyCustomer } from "./warrantyCustomer";
describe("garantieklant na CRM-koppeling", () => {
  it("gebruikt de expliciet gekoppelde claimklant boven de voertuigklant", () => {
    expect(warrantyCustomer({ customer_id: "new", customerContact: { company_name: "Nature Flowers VOF", email: "test@example.invalid" }, vehicles: { customer_id: "old", customerContact: { first_name: "Old" } } })).toEqual({ customerId: "new", customerName: "Nature Flowers VOF", customerEmail: "test@example.invalid", customerPhone: undefined });
  });
  it("bewaart handmatige klantgegevens bij een werkplaatsauto zonder klant", () => {
    expect(warrantyCustomer({ vehicles: {}, manual_customer_name: "Manual", manual_customer_phone: "123" }).customerName).toBe("Manual");
    expect(warrantyCustomer({ vehicles: {}, manual_customer_phone: "123" }).customerPhone).toBe("123");
  });
});