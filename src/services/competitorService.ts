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

// Top Vehicle Groups (grouped by brand+model+year+km-bucket)
interface TopGroupAccumulator {
  brand: string;
  model: string;
  buildYear: number;
  mileageRange: string;
  mileageBucket: number;
  minPrice: number;
  maxPrice: number;
  inStock: number;
  sold: number;
  vehicleIds: string[];
  prices: number[];
  stockDays: number[];
}

export async function fetchTopVehicleGroups(dealerId?: string) {
  let query = supabase
    .from('competitor_vehicles')
    .select('id, brand, model, build_year, mileage, price, status, total_stock_days');
    
  if (dealerId) {
    query = query.eq('dealer_id', dealerId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  const groups: Record<string, TopGroupAccumulator> = {};
  
  data?.forEach(v => {
    const kmBucket = Math.floor((v.mileage || 0) / 50000);
    const kmRange = `${kmBucket * 50}-${(kmBucket + 1) * 50}k`;
    const key = `${v.brand?.toUpperCase()}|${v.model?.toUpperCase()}|${v.build_year || 0}|${kmBucket}`;
    
    if (!groups[key]) {
      groups[key] = {
        brand: v.brand?.toUpperCase() || '',
        model: v.model?.toUpperCase() || '',
        buildYear: v.build_year || 0,
        mileageRange: kmRange,
        mileageBucket: kmBucket,
        minPrice: Infinity,
        maxPrice: 0,
        inStock: 0,
        sold: 0,
        vehicleIds: [],
        prices: [],
        stockDays: []
      };
    }
    
    if (v.price) {
      groups[key].prices.push(v.price);
      groups[key].minPrice = Math.min(groups[key].minPrice, v.price);
      groups[key].maxPrice = Math.max(groups[key].maxPrice, v.price);
    }
    
    if (v.total_stock_days) {
      groups[key].stockDays.push(v.total_stock_days);
    }
    
    if (v.status === 'in_stock') groups[key].inStock++;
    else if (v.status === 'sold') groups[key].sold++;
    
    groups[key].vehicleIds.push(v.id);
  });
  
  return Object.values(groups)
    .map(g => ({
      brand: g.brand,
      model: g.model,
      buildYear: g.buildYear,
      mileageRange: g.mileageRange,
      mileageBucket: g.mileageBucket,
      minPrice: g.minPrice === Infinity ? 0 : g.minPrice,
      maxPrice: g.maxPrice,
      avgPrice: g.prices.length > 0 
        ? Math.round(g.prices.reduce((a, b) => a + b, 0) / g.prices.length) 
        : 0,
      inStock: g.inStock,
      sold: g.sold,
      avgStockDays: g.stockDays.length > 0 
        ? Math.round(g.stockDays.reduce((a, b) => a + b, 0) / g.stockDays.length) 
        : 0,
      vehicleIds: g.vehicleIds
    }))
    .filter(g => (g.inStock + g.sold) >= 2)
    .sort((a, b) => (b.inStock + b.sold) - (a.inStock + a.sold))
    .slice(0, 25);
}

export async function fetchVehiclesByIds(ids: string[]): Promise<CompetitorVehicle[]> {
  if (ids.length === 0) return [];
  
  const { data, error } = await supabase
    .from('competitor_vehicles')
    .select('*, dealer:competitor_dealers(*)')
    .in('id', ids)
    .order('sold_at', { ascending: false, nullsFirst: false });
    
  if (error) throw error;
  return (data || []) as CompetitorVehicle[];
}
