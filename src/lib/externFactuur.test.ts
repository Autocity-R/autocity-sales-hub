import { describe, it, expect } from "vitest";
import { externOrdersZonderFactuur, externInvoiceDraft, isExternOrder } from "./externFactuur";

const order = (over: Partial<any>): any => ({
  id: "o1", status: "goedgekeurd", origin: "extern", external_customer: { name: "Klant" },
  factuur_niet_nodig: false, ...over,
});

describe("externOrdersZonderFactuur", () => {
  it("neemt goedgekeurde externe orders zonder factuur mee", () => {
    expect(externOrdersZonderFactuur([order({})], [])).toHaveLength(1);
  });

  it("sluit orders uit die via work_order_id gekoppeld zijn", () => {
    const invoices = [{ work_order_id: "o1", source_work_order_ids: [] }];
    expect(externOrdersZonderFactuur([order({})], invoices)).toHaveLength(0);
  });

  it("sluit orders uit die via source_work_order_ids gekoppeld zijn", () => {
    const invoices = [{ work_order_id: null, source_work_order_ids: ["o9", "o1"] }];
    expect(externOrdersZonderFactuur([order({})], invoices)).toHaveLength(0);
  });

  it("sluit orders uit die gemarkeerd zijn als geen factuur nodig", () => {
    expect(externOrdersZonderFactuur([order({ factuur_niet_nodig: true })], [])).toHaveLength(0);
  });

  it("sluit niet-externe orders uit", () => {
    expect(externOrdersZonderFactuur([order({ origin: null, external_customer: null })], [])).toHaveLength(0);
    // external_customer zonder origin telt ook als extern
    expect(externOrdersZonderFactuur([order({ origin: null })], [])).toHaveLength(1);
  });

  it("sluit niet-goedgekeurde orders uit", () => {
    expect(externOrdersZonderFactuur([order({ status: "afgerond" })], [])).toHaveLength(0);
  });
});

describe("isExternOrder", () => {
  it("origin extern of external_customer", () => {
    expect(isExternOrder({ origin: "extern", external_customer: null })).toBe(true);
    expect(isExternOrder({ origin: null, external_customer: { name: "X" } })).toBe(true);
    expect(isExternOrder({ origin: null, external_customer: null })).toBe(false);
  });
});

describe("externInvoiceDraft", () => {
  it("vult klant, auto en omschrijving voor en koppelt de order", () => {
    const d = externInvoiceDraft({
      id: "o1", branch: "breda", description: "Montage trekhaak", part: null, parts: ["Trekhaak"],
      external_customer: { name: "Konings Montage B.V", email: "info@konings.nl" },
      vehicle: { brand: "Volvo", model: "XC40", license_number: "VFX-27-L", vin: "VIN123" },
    });
    expect(d.work_order_id).toBe("o1");
    expect(d.branch).toBe("breda");
    expect(d.customer.name).toBe("Konings Montage B.V");
    expect(d.vehicle.license_number).toBe("VFX-27-L");
    expect(d.lines[0].description).toBe("Trekhaak — Montage trekhaak");
  });

  it("valt terug op rotterdam en lege klant", () => {
    const d = externInvoiceDraft({ id: "o2", branch: null, description: null, external_customer: null, vehicle: null });
    expect(d.branch).toBe("rotterdam");
    expect(d.customer.name).toBe("");
    expect(d.lines[0].description).toBe("");
  });
});
