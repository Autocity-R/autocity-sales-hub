// Portal listing (van AI zoekopdracht)
export interface PortalListing {
  id: string;
  portal: 'gaspedaal' | 'autoscout24' | 'autotrack' | 'marktplaats' | 'jpcars_window';
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
  // Extra JP Cars Window fields
  dealer?: string;
  daysInStock?: number;
  soldSince?: number;
}

// JP Cars Window item (from their API)
export interface JPCarsWindowItem {
  make?: string;
  model?: string;
  price_local?: number;
  mileage?: number;
  build?: number;
  url?: string;
  dealer_name?: string;
  days_in_stock?: number;
  sold_since?: number;
  options?: string[];
}

// JP Cars data (inclusief APR/ETR en uitgebreide stats)
// BELANGRIJK: APR en ETR zijn SCORES (1-5), geen dagen!
// APR = prijspositie (5 = beste prijs tov markt)
// ETR = doorloopsnelheid (5 = snelste verkoop)
export interface JPCarsData {
  baseValue: number;
  optionValue: number;
  totalValue: number;
  range: { min: number; max: number };
  confidence: number;
  apr: number;  // Score 1-5 (prijspositie)
  etr: number;  // Score 1-5 (doorloopsnelheid, uit stat_turnover_ext)
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
    avgDays: number | null;    // Gemiddelde statijd voorraad (ECHTE DAGEN)
  };
  salesStats?: {
    count: number;      // Aantal vergelijkbare auto's verkocht
    avgDays: number | null;    // Gemiddelde tijd tot verkoop (ECHTE DAGEN)
  };
  marketDiscount?: number | null;  // Gemiddelde marktdiscount (vraag - verkoop)
  itr?: number | null;             // Internal Turnover Rate (score 1-5)
  
  // RISICO-MANAGEMENT DATA
  priceSensitivity?: number | null;  // 0-1, hoe prijsgevoelig de markt is (1 = zeer gevoelig)
  aprBreakdown?: {
    mileage_impact?: number;   // Impact van km op APR score
    options_impact?: number;   // Impact van opties op APR score
    age_impact?: number;       // Impact van leeftijd op APR score
  } | null;
  
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
  
  // Extra JP Cars velden
  rankTarget?: number | null;      // Target ranking positie
  rankCurrent?: number | null;     // Huidige ranking positie
  targetPerc?: number | null;      // Target percentage
  valueExex?: number | null;       // Waarde exclusief BTW
  topdownValue?: number | null;    // Top-down berekende waarde
  valueAtMaturity?: number | null; // Waarde bij volwassenheid/standaard km
  
  // JP Cars Window data (alle vergelijkbare listings)
  window?: JPCarsWindowItem[];
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

// Taxatie feedback - extended for reasoning-based learning
export interface TaxatieFeedback {
  rating: number;
  wasAccurate: boolean;
  reason?: TaxatieFeedbackType;
  notes: string;
  // Enhanced fields for reasoning-based learning
  referencedListingId?: string;
  userReasoning?: string;
  userSuggestedPrice?: number;
  correctionType?: TaxatieCorrectionType;
}

// Extended feedback types including positive feedback
export type TaxatieFeedbackType = 
  | 'te_hoog' 
  | 'te_laag' 
  | 'te_voorzichtig' 
  | 'te_agressief' 
  | 'listing_niet_herkend'
  | 'verkeerde_referentie'
  | 'km_correctie_fout'
  | 'uitvoering_correctie_fout'
  | 'markt_verkeerd_ingeschat'
  | 'goede_taxatie'
  | 'anders';

// Correction types for detailed analysis
export type TaxatieCorrectionType = 'km' | 'uitvoering' | 'markt' | 'listing' | 'anders';

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
export type TaxatieInputMode = 'kenteken' | 'handmatig' | 'jpcars';
