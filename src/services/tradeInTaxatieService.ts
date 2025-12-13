import type {
  TaxatieVehicleData,
  PortalAnalysis,
  JPCarsData,
  InternalComparison,
} from '@/types/taxatie';
import { supabase } from '@/integrations/supabase/client';

// Trade-in specific advice interface
export interface TradeInAdvice {
  // Interne prijzen (niet aan klant tonen)
  internalMaxPrice: number;
  calculatedMargin: number;
  marketFloorPrice: number;
  
  // Klant-gericht
  customerOfferPrice: number;
  
  // Courantheid
  courantheid: 'courant' | 'gemiddeld' | 'incourant';
  courantheidsPercentage: number;
  
  // Verhaal voor klant
  customerStory: string;
  
  // Risico's en argumenten
  modelRisks: string[];
  marketArguments: string[];
  
  // Reasoning
  reasoning: string;
}

// Fallback advice when AI is unavailable
const generateFallbackTradeInAdvice = (
  vehicleData: TaxatieVehicleData,
  portalAnalysis: PortalAnalysis,
  jpCarsData: JPCarsData
): TradeInAdvice => {
  const marketFloor = portalAnalysis.lowestPrice || jpCarsData.totalValue || 0;
  
  // Bepaal courantheid
  let courantheid: 'courant' | 'gemiddeld' | 'incourant' = 'gemiddeld';
  let courantheidsPercentage = 0.75; // 25% marge
  
  if (jpCarsData.apr >= 75 && jpCarsData.etr < 20) {
    courantheid = 'courant';
    courantheidsPercentage = 0.82; // 18% marge
  } else if (jpCarsData.apr < 50 || jpCarsData.etr > 45) {
    courantheid = 'incourant';
    courantheidsPercentage = 0.70; // 30% marge
  }
  
  const internalMaxPrice = Math.round(marketFloor * courantheidsPercentage);
  const calculatedMargin = marketFloor - internalMaxPrice;
  
  // Minimale marge check
  const finalInternalPrice = calculatedMargin < 1500 && marketFloor > 1500 
    ? marketFloor - 1500 
    : internalMaxPrice;
  
  // Klant-bod: interne prijs + 8% van marktvloer
  const customerOfferPrice = Math.round(finalInternalPrice + (marketFloor * 0.08));

  return {
    internalMaxPrice: finalInternalPrice,
    calculatedMargin: marketFloor - finalInternalPrice,
    marketFloorPrice: marketFloor,
    customerOfferPrice,
    courantheid,
    courantheidsPercentage,
    customerStory: `We hanteren een standaard handelsmarge van 10%. Op basis van de huidige marktomstandigheden voor de ${vehicleData.brand} ${vehicleData.model} komen we uit op een bod van €${customerOfferPrice.toLocaleString('nl-NL')}.`,
    modelRisks: ['Automatisch berekend - handmatige verificatie noodzakelijk'],
    marketArguments: [],
    reasoning: `⚠️ AI advies niet beschikbaar. Dit is een automatische berekening op basis van marktvloer €${marketFloor.toLocaleString('nl-NL')} met ${Math.round((1 - courantheidsPercentage) * 100)}% marge (${courantheid}).`,
  };
};

// Generate Trade-In advice via dedicated Edge Function
export const generateTradeInAdvice = async (
  vehicleData: TaxatieVehicleData,
  portalAnalysis: PortalAnalysis,
  jpCarsData: JPCarsData,
  internalComparison: InternalComparison
): Promise<TradeInAdvice> => {
  try {
    console.log('🚗 Calling taxatie-trade-in-advice edge function...');
    
    const { data, error } = await supabase.functions.invoke('taxatie-trade-in-advice', {
      body: {
        vehicleData,
        portalAnalysis,
        jpCarsData,
        internalComparison,
      }
    });

    if (error) {
      console.error('❌ Trade-in edge function error:', error);
      throw new Error(error.message || 'Edge function call failed');
    }

    if (!data?.success || !data?.advice) {
      console.error('❌ Invalid response from trade-in edge function:', data);
      throw new Error(data?.error || 'Invalid response from AI');
    }

    console.log('✅ Trade-in advice received');
    return data.advice;

  } catch (err) {
    console.error('❌ Trade-in advice generation failed, using fallback:', err);
    return generateFallbackTradeInAdvice(vehicleData, portalAnalysis, jpCarsData);
  }
};
