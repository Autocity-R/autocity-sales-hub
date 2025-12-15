export interface CompetitorDealer {
  id: string;
  name: string;
  website_url: string | null;
  scrape_url: string;
  scrape_schedule: string;
  scrape_time: string;
  last_scraped_at: string | null;
  last_scrape_status: string | null;
  last_scrape_vehicles_count: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitorVehicle {
  id: string;
  dealer_id: string;
  fingerprint: string;
  external_url: string | null;
  license_plate: string | null;
  brand: string;
  model: string;
  variant: string | null;
  build_year: number | null;
  mileage: number | null;
  mileage_bucket: number | null;
  price: number | null;
  fuel_type: string | null;
  transmission: string | null;
  body_type: string | null;
  color: string | null;
  image_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  sold_at: string | null;
  status: 'in_stock' | 'sold' | 'removed';
  consecutive_missing_scrapes: number;
  total_stock_days: number;
  reappeared_count: number;
  created_at: string;
  updated_at: string;
  // Joined dealer info
  dealer?: CompetitorDealer;
}

export interface CompetitorPriceHistory {
  id: string;
  vehicle_id: string;
  old_price: number | null;
  new_price: number | null;
  price_change: number | null;
  recorded_at: string;
}

export interface CompetitorScrapeLog {
  id: string;
  dealer_id: string;
  scraped_at: string;
  status: string;
  vehicles_found: number | null;
  vehicles_new: number | null;
  vehicles_sold: number | null;
  vehicles_reappeared: number | null;
  error_message: string | null;
  duration_ms: number | null;
}

export interface ScrapedVehicleData {
  externalUrl: string;
  brand: string;
  model: string;
  variant?: string;
  buildYear?: number;
  mileage?: number;
  price?: number;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  color?: string;
  imageUrl?: string;
  licensePlate?: string;
}

export interface CompetitorVehicleFilters {
  dealerId?: string;
  status?: 'in_stock' | 'sold' | 'all';
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  sortBy?: 'first_seen_at' | 'sold_at' | 'total_stock_days' | 'price';
  sortOrder?: 'asc' | 'desc';
}

export interface CompetitorStats {
  totalStock: number;
  totalSold: number;
  avgStockDays: number;
  newThisWeek: number;
  soldThisWeek: number;
  topBrands: { brand: string; count: number }[];
}

export interface TopVehicleGroup {
  brand: string;
  model: string;
  buildYear: number;
  mileageRange: string;
  mileageBucket: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  inStock: number;
  sold: number;
  avgStockDays: number;
  vehicleIds: string[];
}
