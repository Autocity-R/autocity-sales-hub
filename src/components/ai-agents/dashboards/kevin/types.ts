export interface JoinedVehicle {
  id: string;
  brand: string;
  model: string;
  license_number: string | null;
  price_local: number | null;
  vvp_50: number | null;
  stock_days: number | null;
  stock_days_average: number | null;
  rank_current: number | null;
  window_size: number | null;
  apr: number | null;
  etr: number | null;
  stat_sold_count: number | null;
  price_warning: number | null;
  price_history_amount_1: number | null;
  price_history_date_1: string | null;
  fuel: string | null;
  synced_at: string | null;
  category: 'red' | 'yellow' | 'green';
  price_vs_market: number | null;
  mileage: number | null;
  build_year: number | null;
  jpcars_url: string | null;
}

export function categorize(rank: number | null, windowSize: number | null, stockDays: number | null, stockAvg: number | null, priceWarning: number | null): 'red' | 'yellow' | 'green' {
  const rankPct = (rank !== null && windowSize !== null && windowSize > 0) ? rank / windowSize : null;

  if (rankPct !== null && rankPct > 0.8) return 'red';
  if (priceWarning !== null && priceWarning > 2000) return 'red';
  if (stockDays !== null && stockAvg !== null && stockAvg > 0 && stockDays > stockAvg * 1.3) return 'red';
  if (stockDays !== null && stockDays > 45) return 'red';

  if (rankPct !== null && rankPct > 0.5) return 'yellow';
  if (priceWarning !== null && priceWarning > 500) return 'yellow';
  if (stockDays !== null && stockAvg !== null && stockAvg > 0 && stockDays > stockAvg) return 'yellow';
  if (stockDays !== null && stockDays > 35) return 'yellow';

  return 'green';
}

export function getReasons(v: JoinedVehicle): string[] {
  const reasons: string[] = [];
  if (v.stock_days != null && v.stock_days > 45) {
    reasons.push(`${v.stock_days} stagedagen (gem: ${v.stock_days_average ?? '?'})`);
  } else if (v.stock_days != null && v.stock_days > 35) {
    reasons.push(`${v.stock_days} stagedagen`);
  }
  const rankPct = (v.rank_current != null && v.window_size != null && v.window_size > 0) ? v.rank_current / v.window_size : null;
  if (rankPct != null && rankPct > 0.8) {
    reasons.push(`Rang ${v.rank_current}/${v.window_size} (duurste segment)`);
  } else if (rankPct != null && rankPct > 0.5) {
    reasons.push(`Rang ${v.rank_current}/${v.window_size}`);
  }
  if (v.price_warning != null && v.price_warning > 500) {
    reasons.push(`Zak €${v.price_warning.toLocaleString('nl-NL')}`);
  }
  if (v.price_warning != null && v.price_warning < -50) {
    reasons.push(`Verhoog €${Math.abs(v.price_warning).toLocaleString('nl-NL')} mogelijk`);
  }
  return reasons;
}
