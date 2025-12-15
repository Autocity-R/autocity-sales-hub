import { supabase } from '@/integrations/supabase/client';
import type { 
  CompetitorDealer, 
  CompetitorVehicle, 
  CompetitorVehicleFilters,
  CompetitorScrapeLog,
  CompetitorStats 
} from '@/types/competitor';

// Dealers
export async function fetchCompetitorDealers(): Promise<CompetitorDealer[]> {
  const { data, error } = await supabase
    .from('competitor_dealers')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function createCompetitorDealer(dealer: Omit<CompetitorDealer, 'id' | 'created_at' | 'updated_at' | 'last_scraped_at' | 'last_scrape_status' | 'last_scrape_vehicles_count'>): Promise<CompetitorDealer> {
  const { data, error } = await supabase
    .from('competitor_dealers')
    .insert(dealer)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCompetitorDealer(id: string, updates: Partial<CompetitorDealer>): Promise<CompetitorDealer> {
  const { data, error } = await supabase
    .from('competitor_dealers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteCompetitorDealer(id: string): Promise<void> {
  const { error } = await supabase
    .from('competitor_dealers')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Vehicles
export async function fetchCompetitorVehicles(filters: CompetitorVehicleFilters = {}): Promise<CompetitorVehicle[]> {
  let query = supabase
    .from('competitor_vehicles')
    .select('*, dealer:competitor_dealers(*)');
  
  if (filters.dealerId) {
    query = query.eq('dealer_id', filters.dealerId);
  }
  
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  
  if (filters.brand) {
    query = query.ilike('brand', `%${filters.brand}%`);
  }
  
  if (filters.minPrice) {
    query = query.gte('price', filters.minPrice);
  }
  
  if (filters.maxPrice) {
    query = query.lte('price', filters.maxPrice);
  }
  
  if (filters.minYear) {
    query = query.gte('build_year', filters.minYear);
  }
  
  if (filters.maxYear) {
    query = query.lte('build_year', filters.maxYear);
  }
  
  // Sorting
  const sortBy = filters.sortBy || 'first_seen_at';
  const sortOrder = filters.sortOrder || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  
  const { data, error } = await query;
  
  if (error) throw error;
  return (data || []) as CompetitorVehicle[];
}

export async function fetchCompetitorVehicleById(id: string): Promise<CompetitorVehicle | null> {
  const { data, error } = await supabase
    .from('competitor_vehicles')
    .select('*, dealer:competitor_dealers(*)')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as CompetitorVehicle;
}

// Scrape Logs
export async function fetchScrapeLogs(dealerId?: string, limit = 50): Promise<CompetitorScrapeLog[]> {
  let query = supabase
    .from('competitor_scrape_logs')
    .select('*')
    .order('scraped_at', { ascending: false })
    .limit(limit);
  
  if (dealerId) {
    query = query.eq('dealer_id', dealerId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

// Stats
export async function fetchCompetitorStats(dealerId?: string): Promise<CompetitorStats> {
  let stockQuery = supabase
    .from('competitor_vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'in_stock');
  
  let soldQuery = supabase
    .from('competitor_vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sold');
  
  if (dealerId) {
    stockQuery = stockQuery.eq('dealer_id', dealerId);
    soldQuery = soldQuery.eq('dealer_id', dealerId);
  }
  
  const [stockResult, soldResult] = await Promise.all([stockQuery, soldQuery]);
  
  // Get avg stock days
  let avgQuery = supabase
    .from('competitor_vehicles')
    .select('total_stock_days')
    .eq('status', 'in_stock');
  
  if (dealerId) {
    avgQuery = avgQuery.eq('dealer_id', dealerId);
  }
  
  const { data: stockDaysData } = await avgQuery;
  const avgStockDays = stockDaysData?.length 
    ? stockDaysData.reduce((sum, v) => sum + (v.total_stock_days || 0), 0) / stockDaysData.length 
    : 0;
  
  // Get new this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  let newQuery = supabase
    .from('competitor_vehicles')
    .select('*', { count: 'exact', head: true })
    .gte('first_seen_at', weekAgo.toISOString());
  
  let soldWeekQuery = supabase
    .from('competitor_vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sold')
    .gte('sold_at', weekAgo.toISOString());
  
  if (dealerId) {
    newQuery = newQuery.eq('dealer_id', dealerId);
    soldWeekQuery = soldWeekQuery.eq('dealer_id', dealerId);
  }
  
  const [newResult, soldWeekResult] = await Promise.all([newQuery, soldWeekQuery]);
  
  // Get top brands
  let brandsQuery = supabase
    .from('competitor_vehicles')
    .select('brand')
    .eq('status', 'in_stock');
  
  if (dealerId) {
    brandsQuery = brandsQuery.eq('dealer_id', dealerId);
  }
  
  const { data: brandsData } = await brandsQuery;
  const brandCounts: Record<string, number> = {};
  brandsData?.forEach(v => {
    const brand = v.brand?.toUpperCase() || 'ONBEKEND';
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  });
  
  const topBrands = Object.entries(brandCounts)
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    totalStock: stockResult.count || 0,
    totalSold: soldResult.count || 0,
    avgStockDays: Math.round(avgStockDays),
    newThisWeek: newResult.count || 0,
    soldThisWeek: soldWeekResult.count || 0,
    topBrands,
  };
}

// Trigger scrape
export async function triggerDealerScrape(dealerId: string): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke('scrape-competitor-dealer', {
    body: { dealerId },
  });
  
  if (error) {
    console.error('Scrape error:', error);
    return { success: false, message: error.message };
  }
  
  return data || { success: true, message: 'Scrape completed' };
}
