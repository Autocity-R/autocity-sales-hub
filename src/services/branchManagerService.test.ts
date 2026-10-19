import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const query: Record<string, unknown> = {};
      for (const method of ['select', 'in', 'neq', 'gte', 'lte', 'eq', 'not']) {
        query[method] = () => query;
      }
      query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({
        data: table === 'sales_targets' ? [] : [{
          status: 'verkocht_b2c', selling_price: 30000, purchase_price: 26000,
          sold_date: '2026-10-19T10:00:00Z', details: { warrantyPackagePrice: 995 },
        }],
        count: 1, error: null,
      }).then(resolve);
      return query;
    },
  },
}));

import { branchManagerService } from './branchManagerService';

describe('B2C dashboard calculation', () => {
  it('uses the new targets and adds warranty once without changing vehicle margin percentage', async () => {
    const kpis = await branchManagerService.getB2CKPIs({
      startDate: '2026-10-01T00:00:00Z', endDate: '2026-10-31T23:59:59Z', type: 'month', label: 'Oktober 2026',
    });
    expect(kpis.b2cSalesTarget).toBe(50);
    expect(kpis.b2cRevenueTarget).toBe(200000);
    expect(kpis.b2cRevenue).toBe(4995);
    expect(kpis.upsalesRevenue).toBe(995);
    expect(kpis.b2cMarginPercent).toBeCloseTo(4000 / 30000 * 100);
    expect(kpis.b2cMarginTarget).toBe(15);
    expect(kpis.upsalesTarget).toBe(5000);
  });
});