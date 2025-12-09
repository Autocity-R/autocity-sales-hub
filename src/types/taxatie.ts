// Portal listing (van AI zoekopdracht)
export interface PortalListing {
  id: string;
  portal: 'gaspedaal' | 'autoscout24' | 'autotrack' | 'marktplaats';
  url: string;
  price: number;
  mileage: number;
  buildYear: number;
  title: string;
  options: string[];
  color?: string;
  matchScore?: number;
  isPrimaryComparable?: boolean;
  isLogicalDeviation?: boolean;
  deviationReason?: string;
}

// JP Cars data (inclusief APR/ETR en uitgebreide stats)
export interface JPCarsData {
  baseValue: number;
  optionValue: number;
  totalValue: number;
  range: { min: number; max: number };
  confidence: number;
  apr: number;
  etr: number;
  courantheid: 'hoog' | 'gemiddeld' | 'laag';
  
  // Safety fallback info
  fallbackWarning?: string;
  originalRequest?: {
    hp?: number;
    usedFallback: boolean;
  };
  
  // Uitgebreide statijd data
  stockStats?: {
    count: number;      // Aantal vergelijkbare auto's in voorraad (window_size)
    avgDays: number | null;    // Gemiddelde statijd voorraad
  };
  salesStats?: {
    count: number;      // Aantal vergelijkbare auto's verkocht
    avgDays: number | null;    // Gemiddelde tijd tot verkoop
  };
  marketDiscount?: number | null;  // Gemiddelde marktdiscount (vraag - verkoop)
  itr?: number | null;             // Internal Turnover Rate
  
  // Portal links van JP Cars
  portalUrls?: {
    gaspedaal?: string | null;
    autoscout24?: string | null;
    marktplaats?: string | null;
    jpCarsWindow?: string | null;
  };
  
  // Top dealers data
  topDealers?: Array<{
    name: string;
    stockCount: number;
    soldCount: number;
    turnover: number;
  }>;
  
  // Waarde breakdown
  valueBreakdown?: Record<string, number> | null;
}

// Portal zoekfilters met correcte KM-logica
export interface PortalSearchFilters {
  brand: string;
  model: string;
  buildYearFrom: number;
  buildYearTo: number;
  mileageMax: number; // ALLEEN maximum (afgerond + 20k)
  fuelType: string;
  transmission: 'Automaat' | 'Handgeschakeld' | 'Beide';
  bodyType?: string;
  keywords: string[];
  requiredOptions: string[];
}

// Portal analyse resultaat
export interface PortalAnalysis {
  lowestPrice: number;
  medianPrice: number;
  highestPrice: number;
  listingCount: number;
  primaryComparableCount: number;
  appliedFilters: PortalSearchFilters;
  listings: PortalListing[];
  logicalDeviations: string[];
  directSearchUrls?: {
    gaspedaal: string;
    autoscout24: string;
    autotrack: string;
  };
  priceSpreadWarning?: string | null;
}

// Vergelijkbare verkoop uit historie
export interface SimilarVehicleSale {
  id: string;
  brand: string;
  model: string;
  buildYear: number;
  mileage: number;
  purchasePrice: number;
  sellingPrice: number;
  margin: number;
  daysToSell: number;
  channel: 'B2B' | 'B2C';
  soldAt: string;
}

// Interne vergelijking
export interface InternalComparison {
  averageMargin: number;
  averageDaysToSell: number;
  soldLastYear: number;
  soldB2C: number;
  soldB2B: number;
  averageDaysToSell_B2C: number | null;
  note?: string;
  similarVehicles: SimilarVehicleSale[];
}

// AI Advies
export interface AITaxatieAdvice {
  recommendedSellingPrice: number;
  recommendedPurchasePrice: number;
  expectedDaysToSell: number;
  targetMargin: number;
  recommendation: 'kopen' | 'niet_kopen' | 'twijfel';
  reasoning: string;
  jpcarsDeviation: string;
  riskFactors: string[];
  opportunities: string[];
  primaryListingsUsed: number;
}

// Taxatie feedback
export interface TaxatieFeedback {
  rating: number;
  wasAccurate: boolean;
  reason?: 'te_hoog' | 'te_laag' | 'te_voorzichtig' | 'te_agressief' | 'anders';
  notes: string;
}

// Taxatie uitkomst (voor learning)
export interface TaxatieOutcome {
  wasPurchased: boolean;
  actualPurchasePrice?: number;
  actualSellingPrice?: number;
  actualDaysToSell?: number;
  actualMargin?: number;
}

// Voertuiggegevens - uitgebreid voor JP Cars & Gaspedaal
export interface TaxatieVehicleData {
  brand: string;
  model: string;
  buildYear: number;
  modelYear?: number; // Kan afwijken van bouwjaar
  mileage: number;
  fuelType: string;
  transmission: 'Automaat' | 'Handgeschakeld' | 'Onbekend';
  bodyType: string; // Hatchback, Sedan, SUV, etc.
  power: number;
  powerKw?: number; // KW naast PK
  trim: string;
  color: string;
  options: string[];
  keywords?: string[]; // Extra zoektermen zoals "R-Line"
}

// Complete taxatie record
export interface TaxatieValuation {
  id: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  vehicleId?: string;
  aiModelVersion?: string;
  licensePlate: string;
  vehicleData: TaxatieVehicleData;
  portalAnalysis: PortalAnalysis | null;
  jpCarsData: JPCarsData | null;
  internalComparison: InternalComparison | null;
  aiAdvice: AITaxatieAdvice | null;
  status: 'concept' | 'in_behandeling' | 'voltooid' | 'gekocht' | 'afgewezen';
  feedback?: TaxatieFeedback;
  outcome?: TaxatieOutcome;
}

// Loading states per bron
export interface TaxatieLoadingState {
  rdw: boolean;
  portals: boolean;
  jpCars: boolean;
  internalHistory: boolean;
  aiAnalysis: boolean;
}

// Invoer mode
export type TaxatieInputMode = 'kenteken' | 'handmatig';
