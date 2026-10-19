/** Shared defaults for the monthly B2C team targets. */
export const B2C_TARGET_DEFAULTS = {
  b2c_units: 50,
  b2c_revenue: 200000,
  b2c_margin_percent: 15,
  upsales_revenue: 5000,
} as const;

/** Warranty revenue is already tracked separately; add it exactly once. */
export function b2cMarginIncludingWarranty(vehicleMargin: number, warrantyRevenue: number): number {
  return vehicleMargin + warrantyRevenue;
}