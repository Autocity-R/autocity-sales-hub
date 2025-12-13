import type {
  TaxatieVehicleData,
  PortalAnalysis,
  JPCarsData,
  InternalComparison,
} from '@/types/taxatie';
import { supabase } from '@/integrations/supabase/client';

// Warning type for trade-in advice
export interface TradeInWarning {
  type: 'color' | 'standingTime' | 'modelRisk' | 'warranty' | 'fuel' | 'season';
  title: string;
  description: string;
  repairCost?: string;
  severity: 'high' | 'medium' | 'low';
}

// Trade-in specific advice interface - klant-transparant format
export interface TradeInAdvice {
  // Klant-zichtbaar
  marketReferencePrice: number;
  maxPurchasePrice: number;
  standardCorrectionPercentage: number;
  portalUrl?: string;
  
  // Waarschuwingen (klant ziet "aandachtspunten", verkoper ziet "inkoppertjes")
  warnings: TradeInWarning[];
  warningCount: number;
  
  // Verkoper-hint (subtiel onderaan)
  sellerAdvice: string;
  
  // Reasoning
  reasoning: string;
}

// Fallback advice when AI is unavailable
const generateFallbackTradeInAdvice = (
  vehicleData: TaxatieVehicleData,
  portalAnalysis: PortalAnalysis,
  jpCarsData: JPCarsData
): TradeInAdvice => {
  const marketRef = portalAnalysis.lowestPrice || jpCarsData.totalValue || 0;
  const maxPurchase = Math.round(marketRef * 0.90);
  
  const warnings: TradeInWarning[] = [];
  
  // Check kleur
  const incouranteKleuren = ['rood', 'groen', 'geel', 'oranje', 'paars', 'bruin', 'beige', 'roze'];
  const kleur = vehicleData.color?.toLowerCase() || '';
  if (incouranteKleuren.some(k => kleur.includes(k))) {
    warnings.push({
      type: 'color',
      title: 'Incourante kleur',
      description: `${vehicleData.color} auto's hebben lagere marktvraag`,
      severity: 'high'
    });
  }
  
  // Check diesel
  if (vehicleData.fuelType?.toLowerCase().includes('diesel')) {
    warnings.push({
      type: 'fuel',
      title: 'Brandstoftrend',
      description: 'Dalende vraag naar diesel in consumentenmarkt',
      severity: 'low'
    });
  }

  return {
    marketReferencePrice: marketRef,
    maxPurchasePrice: maxPurchase,
    standardCorrectionPercentage: 10,
    warnings,
    warningCount: warnings.length,
    sellerAdvice: warnings.length >= 2 
      ? `💡 Let op: gezien ${warnings.length} aandachtspunten adviseer ik voorzichtigheid` 
      : 'Standaard 10% correctie is passend voor dit model',
    reasoning: `⚠️ AI advies niet beschikbaar. Dit is een automatische berekening op basis van marktreferentie €${marketRef.toLocaleString('nl-NL')} met standaard 10% correctie.`,
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
