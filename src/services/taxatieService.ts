import type {
  TaxatieVehicleData,
  PortalAnalysis,
  PortalSearchFilters,
  JPCarsData,
  InternalComparison,
  AITaxatieAdvice,
  TaxatieValuation,
  TaxatieFeedback,
} from '@/types/taxatie';
import { calculateMaxMileage, calculateBuildYearRange } from '@/utils/taxatieHelpers';
import { supabase } from '@/integrations/supabase/client';

// RDW lookup via Edge Function
export const lookupRDW = async (licensePlate: string): Promise<TaxatieVehicleData | null> => {
  try {
    console.log('🔍 Looking up license plate via RDW:', licensePlate);
    
    const { data, error } = await supabase.functions.invoke('rdw-lookup', {
      body: { licensePlate }
    });

    if (error) {
      console.error('❌ RDW edge function error:', error);
      throw new Error(error.message || 'RDW lookup failed');
    }

    if (!data?.success || !data?.data) {
      console.warn('⚠️ RDW lookup returned no data:', data);
      return null;
    }

    console.log('✅ RDW data received:', data.data);
    
    // The data from RDW doesn't include mileage, user needs to fill this in
    return {
      ...data.data,
      mileage: 0, // User must enter this manually
      options: [],
      keywords: [],
    };

  } catch (err) {
    console.error('❌ RDW lookup failed:', err);
    return null;
  }
};

// Build search filters based on vehicle data and correct KM logic
const buildSearchFilters = (vehicleData: TaxatieVehicleData): PortalSearchFilters => {
  const yearRange = calculateBuildYearRange(vehicleData.buildYear);
  const mileageMax = calculateMaxMileage(vehicleData.mileage);

  return {
    brand: vehicleData.brand,
    model: vehicleData.model,
    buildYearFrom: yearRange.from,
    buildYearTo: yearRange.to,
    mileageMax, // ALLEEN max, geen min
    fuelType: vehicleData.fuelType,
    transmission: vehicleData.transmission === 'Onbekend' ? 'Beide' : vehicleData.transmission,
    bodyType: vehicleData.bodyType,
    keywords: vehicleData.keywords || [],
    requiredOptions: vehicleData.options || [],
  };
};

// Portal URLs type from JP Cars
interface JPCarsPortalUrls {
  gaspedaal?: string | null;
  autoscout24?: string | null;
  marktplaats?: string | null;
  jpCarsWindow?: string | null;
}

// Portal Analysis via OpenAI Edge Function
export const fetchPortalAnalysis = async (
  vehicleData: TaxatieVehicleData,
  jpCarsUrls?: JPCarsPortalUrls
): Promise<PortalAnalysis> => {
  try {
    console.log('🔍 Fetching portal analysis via OpenAI...');
    console.log('🔗 Using JP Cars URLs:', jpCarsUrls);
    
    const { data, error } = await supabase.functions.invoke('taxatie-portal-search', {
      body: { vehicleData, jpCarsUrls }
    });

    if (error) {
      console.error('❌ Portal search edge function error:', error);
      throw new Error(error.message || 'Portal search failed');
    }

    if (!data?.success || !data?.data) {
      console.error('❌ Invalid portal search response:', data);
      throw new Error(data?.error || 'Invalid response from portal search');
    }

    console.log('✅ Portal analysis received:', {
      listingCount: data.data.listingCount,
      priceRange: `€${data.data.lowestPrice} - €${data.data.highestPrice}`
    });
    
    return data.data;

  } catch (err) {
    console.error('❌ Portal analysis failed, returning empty result:', err);
    
    // Return empty fallback
    const filters = buildSearchFilters(vehicleData);
    return {
      lowestPrice: 0,
      medianPrice: 0,
      highestPrice: 0,
      listingCount: 0,
      primaryComparableCount: 0,
      appliedFilters: filters,
      listings: [],
      logicalDeviations: ['Portal analyse niet beschikbaar - probeer opnieuw'],
    };
  }
};

// JP Cars lookup via Edge Function
export const fetchJPCarsData = async (
  licensePlate: string,
  vehicleData?: TaxatieVehicleData
): Promise<JPCarsData> => {
  try {
    console.log('🚗 Fetching JP Cars data for:', licensePlate);
    
    const requestBody: Record<string, unknown> = {
      mileage: vehicleData?.mileage || 0,
    };

    // Use license plate if available
    if (licensePlate) {
      requestBody.licensePlate = licensePlate;
    }
    
    // Add vehicle data for better matching
    if (vehicleData) {
      requestBody.make = vehicleData.brand;
      requestBody.model = vehicleData.model;
      requestBody.fuel = vehicleData.fuelType;
      requestBody.gear = vehicleData.transmission;
      requestBody.build = vehicleData.buildYear;
      requestBody.hp = vehicleData.power;
      requestBody.body = vehicleData.bodyType;
      
      // Extra parameters voor betere JP Cars matching
      if (vehicleData.modelYear) {
        requestBody.modelYear = vehicleData.modelYear;
      }
      if (vehicleData.powerKw) {
        requestBody.kw = vehicleData.powerKw;
      }
      if (vehicleData.color) {
        requestBody.color = vehicleData.color;
      }
      
      // Pass options als array (edge function doet de mapping)
      if (vehicleData.options && vehicleData.options.length > 0) {
        requestBody.options = vehicleData.options;
      }
    }

    const { data, error } = await supabase.functions.invoke('jpcars-lookup', {
      body: requestBody
    });

    if (error) {
      console.error('❌ JP Cars edge function error:', error);
      throw new Error(error.message || 'JP Cars lookup failed');
    }

    if (!data?.success || !data?.data) {
      console.error('❌ Invalid JP Cars response:', data);
      throw new Error(data?.error || 'Invalid response from JP Cars');
    }

    console.log('✅ JP Cars data received:', data.data);
    return data.data;

  } catch (err) {
    console.error('❌ JP Cars lookup failed, using fallback:', err);
    
    // Return fallback mock data if API fails
    return {
      baseValue: 0,
      optionValue: 0,
      totalValue: 0,
      range: { min: 0, max: 0 },
      confidence: 0,
      apr: 0,
      etr: 30,
      courantheid: 'gemiddeld',
    };
  }
};

// Internal comparison via database Edge Function
export const fetchInternalComparison = async (vehicleData: TaxatieVehicleData): Promise<InternalComparison> => {
  try {
    console.log('🔍 Fetching internal comparison from database...');
    
    const { data, error } = await supabase.functions.invoke('taxatie-internal-search', {
      body: { vehicleData }
    });

    if (error) {
      console.error('❌ Internal search edge function error:', error);
      throw new Error(error.message || 'Internal search failed');
    }

    if (!data?.success || !data?.data) {
      console.error('❌ Invalid internal search response:', data);
      throw new Error(data?.error || 'Invalid response from internal search');
    }

    console.log('✅ Internal comparison received:', {
      soldLastYear: data.data.soldLastYear,
      averageMargin: `${data.data.averageMargin}%`
    });
    
    return data.data;

  } catch (err) {
    console.error('❌ Internal comparison failed, returning empty result:', err);
    
    // Return empty fallback
    return {
      averageMargin: 0,
      averageDaysToSell: 0,
      soldLastYear: 0,
      soldB2C: 0,
      soldB2B: 0,
      averageDaysToSell_B2C: null,
      note: 'Geen interne data beschikbaar',
      similarVehicles: [],
    };
  }
};

// Fallback advice when AI is unavailable
const generateFallbackAdvice = (
  vehicleData: TaxatieVehicleData,
  portalAnalysis: PortalAnalysis,
  jpCarsData: JPCarsData
): AITaxatieAdvice => {
  const recommendedSellingPrice = Math.round(portalAnalysis.lowestPrice * 0.98);
  const targetMargin = 20;
  const recommendedPurchasePrice = Math.round(recommendedSellingPrice * (1 - targetMargin / 100));

  return {
    recommendedSellingPrice,
    recommendedPurchasePrice,
    expectedDaysToSell: jpCarsData.etr,
    targetMargin,
    recommendation: 'twijfel',
    reasoning: `⚠️ AI advies niet beschikbaar. Dit is een automatische berekening op basis van portaaldata. 
    
Verkoopprijs: Laagste vergelijkbare listing (€${portalAnalysis.lowestPrice.toLocaleString()}) minus 2% = €${recommendedSellingPrice.toLocaleString()}.
Inkoopprijs: Verkoopprijs met 20% standaardmarge = €${recommendedPurchasePrice.toLocaleString()}.
Verwachte statijd: JP Cars ETR van ${jpCarsData.etr} dagen.

⚠️ Controleer dit advies handmatig voordat je een bod uitbrengt.`,
    jpcarsDeviation: 'Geen AI analyse beschikbaar - handmatige verificatie aanbevolen',
    riskFactors: ['Automatisch berekend - handmatige verificatie noodzakelijk'],
    opportunities: [],
    primaryListingsUsed: portalAnalysis.primaryComparableCount,
  };
};

// AI-powered advice generation via Edge Function
export const generateAIAdvice = async (
  vehicleData: TaxatieVehicleData,
  portalAnalysis: PortalAnalysis,
  jpCarsData: JPCarsData,
  internalComparison: InternalComparison
): Promise<AITaxatieAdvice> => {
  try {
    console.log('🤖 Calling taxatie-ai-advice edge function...');
    
    const { data, error } = await supabase.functions.invoke('taxatie-ai-advice', {
      body: {
        vehicleData,
        portalAnalysis,
        jpCarsData,
        internalComparison,
      }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
      throw new Error(error.message || 'Edge function call failed');
    }

    if (!data?.success || !data?.advice) {
      console.error('❌ Invalid response from edge function:', data);
      throw new Error(data?.error || 'Invalid response from AI');
    }

    console.log('✅ AI advice received:', data.advice.recommendation);
    return data.advice;

  } catch (err) {
    console.error('❌ AI advice generation failed, using fallback:', err);
    return generateFallbackAdvice(vehicleData, portalAnalysis, jpCarsData);
  }
};

// Taxatie opslaan
export const saveTaxatieValuation = async (valuation: Partial<TaxatieValuation>): Promise<TaxatieValuation> => {
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    createdBy: 'current-user-id',
    createdByName: 'Demo User',
    aiModelVersion: 'gemini-2.5-flash-taxatie-v1',
    status: 'voltooid',
    licensePlate: '',
    ...valuation,
  } as TaxatieValuation;
};

// Feedback opslaan
export const saveTaxatieFeedback = async (
  valuationId: string,
  feedback: TaxatieFeedback
): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('Feedback saved:', { valuationId, feedback });
};

// Taxatie historie ophalen
export const fetchTaxatieHistory = async (): Promise<TaxatieValuation[]> => {
  await new Promise(resolve => setTimeout(resolve, 800));

  return [
    {
      id: '1',
      createdAt: '2024-12-06T14:30:00Z',
      createdBy: 'user-1',
      createdByName: 'Jan de Vries',
      licensePlate: 'AB-123-CD',
      aiModelVersion: 'gemini-2.5-flash-taxatie-v1',
      vehicleData: {
        brand: 'BMW',
        model: '3 Serie',
        buildYear: 2022,
        mileage: 35000,
        fuelType: 'Diesel',
        transmission: 'Automaat',
        bodyType: 'Sedan',
        power: 190,
        trim: 'M Sport',
        color: 'Zwart',
        options: ['Navigatie', 'LED', 'ACC'],
      },
      portalAnalysis: null,
      jpCarsData: null,
      internalComparison: null,
      aiAdvice: {
        recommendedSellingPrice: 42500,
        recommendedPurchasePrice: 35000,
        expectedDaysToSell: 21,
        targetMargin: 17.5,
        recommendation: 'kopen',
        reasoning: 'Goede auto',
        jpcarsDeviation: 'Kleine afwijking',
        riskFactors: [],
        opportunities: [],
        primaryListingsUsed: 4,
      },
      status: 'gekocht',
    },
    {
      id: '2',
      createdAt: '2024-12-05T10:15:00Z',
      createdBy: 'user-2',
      createdByName: 'Piet Jansen',
      licensePlate: 'EF-456-GH',
      aiModelVersion: 'gemini-2.5-flash-taxatie-v1',
      vehicleData: {
        brand: 'Audi',
        model: 'A4',
        buildYear: 2020,
        mileage: 62000,
        fuelType: 'Benzine',
        transmission: 'Automaat',
        bodyType: 'Sedan',
        power: 150,
        trim: 'S-Line',
        color: 'Wit',
        options: ['Navigatie'],
      },
      portalAnalysis: null,
      jpCarsData: null,
      internalComparison: null,
      aiAdvice: {
        recommendedSellingPrice: 28900,
        recommendedPurchasePrice: 23500,
        expectedDaysToSell: 28,
        targetMargin: 18.7,
        recommendation: 'twijfel',
        reasoning: 'Hoge kilometerstand',
        jpcarsDeviation: 'JP Cars te optimistisch',
        riskFactors: ['Hoge km'],
        opportunities: [],
        primaryListingsUsed: 6,
      },
      status: 'afgewezen',
    },
  ];
};
