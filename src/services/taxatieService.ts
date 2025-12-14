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
    
    return {
      ...data.data,
      mileage: 0,
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
    mileageMax,
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

// JP Cars Window item type
interface JPCarsWindowItem {
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

// Portal Analysis via JP Cars Window data (primary) or OpenAI Edge Function (fallback)
export const fetchPortalAnalysis = async (
  vehicleData: TaxatieVehicleData,
  jpCarsUrls?: JPCarsPortalUrls,
  jpCarsWindow?: JPCarsWindowItem[]
): Promise<PortalAnalysis> => {
  try {
    console.log('🔍 Fetching portal analysis...');
    console.log('🔗 JP Cars URLs:', jpCarsUrls);
    console.log('📊 JP Cars Window items:', jpCarsWindow?.length || 0);
    
    const { data, error } = await supabase.functions.invoke('taxatie-portal-search', {
      body: { vehicleData, jpCarsUrls, jpCarsWindow }
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

    if (licensePlate) {
      requestBody.licensePlate = licensePlate;
    }
    
    if (vehicleData) {
      requestBody.make = vehicleData.brand;
      requestBody.model = vehicleData.model;
      requestBody.fuel = vehicleData.fuelType;
      requestBody.gear = vehicleData.transmission;
      requestBody.build = vehicleData.buildYear;
      requestBody.hp = vehicleData.power;
      requestBody.body = vehicleData.bodyType;
      
      if (vehicleData.modelYear) {
        requestBody.modelYear = vehicleData.modelYear;
      }
      if (vehicleData.powerKw) {
        requestBody.kw = vehicleData.powerKw;
      }
      if (vehicleData.color) {
        requestBody.color = vehicleData.color;
      }
      
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

// Portal listing context for feedback learning
export interface FeedbackListingContext {
  price: number;
  mileage: number;
  buildYear: number;
  title: string;
  portal?: string;
}

// Enhanced feedback item type for AI learning
export interface EnhancedFeedbackItem {
  feedback_type: string;
  notes: string | null;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_mileage: number;
  vehicle_build_year: number;
  ai_recommendation: string;
  ai_purchase_price: number;
  ai_selling_price: number;
  actual_outcome: Record<string, unknown> | null;
  // Enhanced fields for reasoning-based learning
  user_reasoning: string | null;
  user_suggested_price: number | null;
  correction_type: string | null;
  referenced_listing_id: string | null;
  // Market context at the time of valuation
  portal_listings: FeedbackListingContext[];
  jpcars_value: number | null;
}

// Fetch recent feedback for AI learning context - enhanced version with market context
export const fetchRecentFeedback = async (limit: number = 50): Promise<EnhancedFeedbackItem[]> => {
  try {
    console.log('📚 Fetching recent feedback for AI learning (enhanced with market context)...');
    
    const { data, error } = await supabase
      .from('taxatie_feedback')
      .select(`
        feedback_type,
        notes,
        actual_outcome,
        user_reasoning,
        user_suggested_price,
        correction_type,
        referenced_listing_id,
        taxatie_valuations!inner (
          vehicle_data,
          ai_advice,
          portal_analysis,
          jpcars_data
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching feedback:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ No feedback found');
      return [];
    }

    // Transform data for AI context with enhanced fields + market context
    return data.map((item: any) => {
      const valuation = item.taxatie_valuations;
      const vehicleData = valuation?.vehicle_data;
      const portalAnalysis = valuation?.portal_analysis;
      const jpCarsData = valuation?.jpcars_data;
      
      // Extract relevant listing context (top 5 by price)
      const portalListings: FeedbackListingContext[] = (portalAnalysis?.listings || [])
        .slice(0, 5)
        .map((l: any) => ({
          price: l.price || 0,
          mileage: l.mileage || 0,
          buildYear: l.buildYear || 0,
          title: l.title || '',
          portal: l.portal || 'onbekend',
        }));
      
      return {
        feedback_type: item.feedback_type,
        notes: item.notes,
        vehicle_brand: vehicleData?.brand || 'Onbekend',
        vehicle_model: vehicleData?.model || 'Onbekend',
        vehicle_mileage: vehicleData?.mileage || 0,
        vehicle_build_year: vehicleData?.buildYear || 0,
        ai_recommendation: valuation?.ai_advice?.recommendation || 'Onbekend',
        ai_purchase_price: valuation?.ai_advice?.recommendedPurchasePrice || 0,
        ai_selling_price: valuation?.ai_advice?.recommendedSellingPrice || 0,
        actual_outcome: item.actual_outcome,
        // Enhanced fields
        user_reasoning: item.user_reasoning,
        user_suggested_price: item.user_suggested_price,
        correction_type: item.correction_type,
        referenced_listing_id: item.referenced_listing_id,
        // Market context at the time of valuation
        portal_listings: portalListings,
        jpcars_value: jpCarsData?.totalValue || null,
      };
    });

  } catch (err) {
    console.error('❌ Failed to fetch feedback:', err);
    return [];
  }
};

// AI-powered advice generation via Edge Function (now with learning context)
export const generateAIAdvice = async (
  vehicleData: TaxatieVehicleData,
  portalAnalysis: PortalAnalysis,
  jpCarsData: JPCarsData,
  internalComparison: InternalComparison
): Promise<AITaxatieAdvice> => {
  try {
    console.log('🤖 Calling taxatie-ai-advice edge function...');
    
    // Fetch recent feedback for learning context
    const recentFeedback = await fetchRecentFeedback(30);
    console.log(`📊 Including ${recentFeedback.length} feedback items for AI learning`);
    
    const { data, error } = await supabase.functions.invoke('taxatie-ai-advice', {
      body: {
        vehicleData,
        portalAnalysis,
        jpCarsData,
        internalComparison,
        feedbackHistory: recentFeedback, // Pass feedback for learning
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

// Save taxatie valuation to database
export const saveTaxatieValuation = async (valuation: {
  licensePlate?: string;
  vehicleData: TaxatieVehicleData;
  portalAnalysis?: PortalAnalysis | null;
  jpCarsData?: JPCarsData | null;
  internalComparison?: InternalComparison | null;
  aiAdvice?: AITaxatieAdvice | null;
  status?: string;
}): Promise<{ id: string } | null> => {
  try {
    console.log('💾 Saving taxatie valuation to database...');
    
    const { data: userData } = await supabase.auth.getUser();
    
    const insertData = {
      created_by: userData.user?.id || null,
      license_plate: valuation.licensePlate || null,
      vehicle_data: valuation.vehicleData as unknown as Record<string, unknown>,
      portal_analysis: (valuation.portalAnalysis || {}) as unknown as Record<string, unknown>,
      jpcars_data: (valuation.jpCarsData || {}) as unknown as Record<string, unknown>,
      internal_comparison: (valuation.internalComparison || {}) as unknown as Record<string, unknown>,
      ai_advice: (valuation.aiAdvice || {}) as unknown as Record<string, unknown>,
      ai_model_version: 'gpt-4o',
      status: valuation.status || 'voltooid',
    };
    
    const { data, error } = await supabase
      .from('taxatie_valuations')
      .insert(insertData as any)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error saving valuation:', error);
      throw error;
    }

    console.log('✅ Valuation saved with ID:', data.id);
    return { id: data.id };

  } catch (err) {
    console.error('❌ Failed to save valuation:', err);
    return null;
  }
};

// Save feedback linked to a valuation - enhanced for reasoning-based learning
export const saveTaxatieFeedback = async (
  valuationId: string,
  feedback: TaxatieFeedback
): Promise<boolean> => {
  try {
    console.log('💾 Saving taxatie feedback to database...');
    
    const { data: userData } = await supabase.auth.getUser();
    
    const insertData = {
      valuation_id: valuationId,
      created_by: userData.user?.id || null,
      feedback_type: feedback.reason || 'algemeen',
      rating: feedback.rating || null,
      notes: feedback.notes || null,
      actual_outcome: {} as Record<string, unknown>,
      // New enhanced fields for reasoning-based learning
      referenced_listing_id: feedback.referencedListingId || null,
      user_reasoning: feedback.userReasoning || null,
      user_suggested_price: feedback.userSuggestedPrice || null,
      correction_type: feedback.correctionType || null,
    };
    
    const { error } = await supabase
      .from('taxatie_feedback')
      .insert(insertData as any);

    if (error) {
      console.error('❌ Error saving feedback:', error);
      throw error;
    }

    console.log('✅ Feedback saved for valuation:', valuationId, {
      type: feedback.reason,
      hasReasoning: !!feedback.userReasoning,
      correctionType: feedback.correctionType,
    });
    return true;

  } catch (err) {
    console.error('❌ Failed to save feedback:', err);
    return false;
  }
};

// Fetch taxatie history from database
export const fetchTaxatieHistory = async (): Promise<TaxatieValuation[]> => {
  try {
    console.log('📚 Fetching taxatie history from database...');
    
    const { data, error } = await supabase
      .from('taxatie_valuations')
      .select(`
        id,
        created_at,
        created_by,
        license_plate,
        vehicle_data,
        portal_analysis,
        jpcars_data,
        internal_comparison,
        ai_advice,
        ai_model_version,
        status
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Error fetching history:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ No taxatie history found');
      return [];
    }

    // Transform database rows to TaxatieValuation objects
    return data.map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      createdBy: row.created_by,
      createdByName: 'Gebruiker', // Would need to join profiles table for names
      licensePlate: row.license_plate || '',
      aiModelVersion: row.ai_model_version || 'gpt-4o',
      vehicleData: row.vehicle_data as TaxatieVehicleData,
      portalAnalysis: row.portal_analysis as PortalAnalysis | null,
      jpCarsData: row.jpcars_data as JPCarsData | null,
      internalComparison: row.internal_comparison as InternalComparison | null,
      aiAdvice: row.ai_advice as AITaxatieAdvice | null,
      status: row.status || 'voltooid',
    }));

  } catch (err) {
    console.error('❌ Failed to fetch history:', err);
    return [];
  }
};
