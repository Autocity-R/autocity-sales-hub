import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaxatieVehicleData {
  brand: string;
  model: string;
  buildYear: number;
  modelYear?: number;
  mileage: number;
  fuelType: string;
  transmission: 'Automaat' | 'Handgeschakeld';
  bodyType: string;
  power: number;
  trim: string;
  color: string;
  options: string[];
  keywords?: string[];
}

interface PortalListing {
  id: string;
  portal: string;
  url: string;
  price: number;
  mileage: number;
  buildYear: number;
  title: string;
  options: string[];
  color?: string;
}

interface PortalAnalysis {
  lowestPrice: number;
  medianPrice: number;
  highestPrice: number;
  listingCount: number;
  listings: PortalListing[];
}

interface JPCarsData {
  baseValue: number;
  optionValue: number;
  totalValue: number;
  range: { min: number; max: number };
  confidence: number;
  apr: number;
  etr: number;
  courantheid: 'hoog' | 'gemiddeld' | 'laag';
  stockStats?: { count: number; avgDays: number | null };
  salesStats?: { count: number; avgDays: number | null };
}

interface InternalComparison {
  averageMargin: number;
  averageDaysToSell: number;
  soldLastYear: number;
  soldB2C: number;
  soldB2B: number;
  averageDaysToSell_B2C: number | null;
  note?: string;
  similarVehicles: Array<{
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
  }>;
}

// Portal listing context for feedback learning
interface FeedbackListingContext {
  price: number;
  mileage: number;
  buildYear: number;
  title: string;
  portal?: string;
}

// Enhanced feedback item with reasoning-based learning fields + market context
interface FeedbackItem {
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

interface TaxatieRequest {
  vehicleData: TaxatieVehicleData;
  portalAnalysis: PortalAnalysis;
  jpCarsData: JPCarsData;
  internalComparison: InternalComparison;
  feedbackHistory?: FeedbackItem[];
}

// DYNAMISCHE OPTIE CATEGORIEËN - Voor alle merken en JP Cars opties
const optionCategories: Record<string, { label: string; valueImpact: string; emoji: string; aliases: string[] }> = {
  // SPORT/LUXE PAKKETTEN (alle merken)
  'sport_package': {
    label: 'Sport/Luxe Pakket',
    valueImpact: '+€500 - €2.500',
    emoji: '🏎️',
    aliases: [
      // Ford
      'st-line', 'st line', 'stline', 'titanium', 'vignale', 'active',
      // BMW
      'm sport', 'm-sport', 'msport', 'm performance', 'm pakket', 'shadowline', 'shadow line',
      // Mercedes
      'amg', 'amg pakket', 'amg line', 'amg-line', 'night pakket', 'night package', 'avantgarde',
      // Audi
      's-line', 's line', 'sline', 'black edition', 'competition',
      // VW
      'r-line', 'r line', 'rline', 'gti', 'gte', 'gtd', 'sport', 'highline',
      // Volvo
      'r-design', 'r design', 'rdesign', 'inscription', 'momentum',
      // Hyundai/Kia
      'n-line', 'n line', 'nline', 'gt-line', 'gt line', 'gtline',
      // Peugeot/Citroen/DS
      'gt', 'gt-line', 'allure', 'shine',
      // Renault
      'rs line', 'rs-line', 'intens', 'techno', 'iconic',
      // Skoda
      'sportline', 'sport line', 'l&k', 'laurin klement', 'monte carlo',
      // Seat/Cupra
      'fr', 'xcellence', 'vz', 'cupra',
      // Porsche
      'sport chrono', 'sport design', 'gts',
      // Lexus
      'f sport', 'f-sport', 'fsport',
      // Land Rover/Jaguar
      'hse', 'r-dynamic', 'r dynamic', 'autobiography',
      // Toyota
      'gr sport', 'gr-sport', 'grsport',
      // Mazda
      'luxury', 'sportive', 'signature',
      // Generiek
      'sport pakket', 'sport package', 'sportpakket', 'sportpackage', 'sport',
      'luxe pakket', 'luxury package', 'luxepakket'
    ]
  },
  
  // PREMIUM AUDIO SYSTEMEN
  'premium_audio': {
    label: 'Premium Audio',
    valueImpact: '+€500 - €1.500',
    emoji: '🔊',
    aliases: [
      // Merken
      'harman kardon', 'harman_kardon', 'harmankardon', 'harman',
      'b&w', 'bowers wilkins', 'bowers_wilkins', 'bowers & wilkins',
      'burmester', 'b&o', 'bang olufsen', 'bang & olufsen', 'bang&olufsen',
      'meridian', 'mark levinson', 'marklevinson', 'levinson',
      'naim', 'focal', 'dynaudio', 'bose', 'jbl', 'krell', 'canton', 
      'alpine', 'beats', 'infinity', 'logic7', 'logic 7', 'revel',
      'lexicon', 'mcintosh', 'olufsen', 'devialet', 'sonos',
      // Generiek
      'premium audio', 'premium_audio', 'premium sound', 'surround sound',
      'audio', 'sound system', 'soundsystem', 'hifi', 'hi-fi'
    ]
  },
  
  // DAK OPTIES
  'roof': {
    label: 'Panoramadak/Open Dak',
    valueImpact: '+€1.500 - €3.000',
    emoji: '🌤️',
    aliases: [
      // Nederlands
      'panoramadak', 'panorama dak', 'open dak', 'schuifdak', 'glazen dak', 'glasdak',
      // Engels
      'panorama roof', 'panoramic roof', 'panoramaroof', 'panoramicroof',
      'sunroof', 'sun roof', 'moonroof', 'moon roof', 'open roof',
      'glass roof', 'glassroof', 'sky roof', 'skyroof',
      // Kort (JP Cars)
      'roof', 'panorama', 'dak'
    ]
  },
  
  // WINTER/COMFORT PAKKETTEN
  'winter_package': {
    label: 'Winter/Comfort Pakket',
    valueImpact: '+€300 - €1.000',
    emoji: '❄️',
    aliases: [
      'winterpakket', 'winter pakket', 'winter pack', 'winter package', 'winterpack',
      'comfort pakket', 'comfort package', 'comfortpakket', 'comfortpackage',
      'plus pack', 'plus pakket', 'tour pakket', 'tour package', 'touring pakket',
      'verwarmde stoelen', 'heated seats', 'stuurverwarming', 'heated steering',
      'winter', 'winterbanden', 'winterset'
    ]
  },
  
  // LUCHTVERING
  'suspension': {
    label: 'Luchtvering/Adaptief Onderstel',
    valueImpact: '+€1.000 - €2.500',
    emoji: '🛋️',
    aliases: [
      'luchtvering', 'lucht vering', 'air suspension', 'airsuspension',
      'airmatic', 'air matic', 'pasm', 'adaptive suspension', 'adaptief onderstel',
      'air ride', 'airride', 'pneumatic suspension', 'pneumatisch',
      'dcc', 'dynamic chassis control', 'four-c', 'active body control', 'abc',
      'magic body control', 'active ride', 'continuous damping control'
    ]
  },
  
  // 7-ZITTER
  'seating': {
    label: '7-Zitter/Extra Zitplaatsen',
    valueImpact: '+€500 - €1.500',
    emoji: '👨‍👩‍👧‍👦',
    aliases: [
      '7 zitter', '7-zitter', '7zitter', '7 seater', '7-seater', '7seater',
      '7 zits', '7-zits', '7zits', 'seven seater', 'seven-seater',
      'third row', '3rd row', 'derde rij', 'extra zitplaatsen', 'extra seats',
      '6 zitter', '6-zitter', '6 seater', '6-seater',
      'zitter', 'seater', 'zits'
    ]
  },
  
  // TREKHAAK
  'towing': {
    label: 'Trekhaak',
    valueImpact: '+€300 - €800',
    emoji: '🚗',
    aliases: [
      'trekhaak', 'trek haak', 'tow bar', 'towbar', 'tow-bar',
      'towing', 'trailer hitch', 'trailerhitch', 'anhängerkupplung',
      'tow hook', 'towhook', 'towing package', 'tow package',
      'haak', 'hitch', 'tow'
    ]
  },
  
  // EV SPECIFIEK - LONG RANGE
  'ev_range': {
    label: 'Long Range / Grote Batterij',
    valueImpact: '+€2.000 - €5.000',
    emoji: '🔋',
    aliases: [
      'long range', 'long_range', 'longrange', 'extended range', 'extendedrange',
      'large battery', 'largebattery', 'groot bereik', 'big battery',
      'range', 'extended', 'plus', 'max', 'performance', 'awd'
    ]
  },
  
  // TECHNOLOGIE PAKKETTEN
  'technology': {
    label: 'Technologie Pakket',
    valueImpact: '+€500 - €1.500',
    emoji: '🖥️',
    aliases: [
      'head up display', 'head-up display', 'head up', 'head-up', 'hud',
      '360 camera', '360camera', '360 graden', 'surround view', 'surroundview',
      'digital cockpit', 'digitalcockpit', 'virtual cockpit', 'virtualcockpit',
      'live cockpit', 'livecockpit', 'widescreen', 'wide screen',
      'distronic', 'pilot assist', 'pilotassist', 'propilot', 'pro pilot',
      'drive wise', 'drivewise', 'tech pakket', 'technology package', 'techpakket',
      'assistance pakket', 'driver assistance', 'adas', 'autopilot', 'auto pilot',
      'lane assist', 'adaptive cruise', 'acc', 'night vision', 'nightvision'
    ]
  },
  
  // PREMIUM VERLICHTING
  'lighting': {
    label: 'Premium Verlichting',
    valueImpact: '+€300 - €1.000',
    emoji: '💡',
    aliases: [
      'matrix led', 'matrixled', 'multibeam', 'multi beam', 'laser light', 'laserlight',
      'iq.light', 'iqlight', 'iq light', 'intellilux', 'intelli lux',
      'pdls', 'pdls+', 'dynamic light', 'adaptive led', 'adaptiveled',
      'led matrix', 'ledmatrix', 'pixel led', 'pixelled', 'digital light',
      'laser', 'xenon', 'bi-xenon', 'bixenon', 'led', 'full led', 'fullled'
    ]
  },
  
  // INTERIEUR LEDER/PREMIUM
  'interior': {
    label: 'Premium Interieur/Leder',
    valueImpact: '+€500 - €2.000',
    emoji: '🪑',
    aliases: [
      'leder', 'leer', 'leather', 'nappa', 'nappa leder', 'nappaleather',
      'alcantara', 'sensatec', 'vernasca', 'merino', 'designo', 'exclusive',
      'individual', 'premium interieur', 'premium interior',
      'sport stoelen', 'sport seats', 'sportstoelen', 'sportseats',
      'elektrisch verstelbaar', 'electric seats', 'power seats',
      'massage', 'massagestoelen', 'massage seats', 'ventilatie', 'ventilated',
      'memory', 'memory seats', 'geheugenstoelen'
    ]
  }
};

// Build explicit value options section for AI prompt
function buildValueOptionsSection(options: string[] | undefined, fuelType: string): string {
  if (!options || options.length === 0) {
    console.log('🔍 No options provided to buildValueOptionsSection');
    return '**Geen opties geselecteerd**\n';
  }

  console.log('🔍 Checking options:', JSON.stringify(options));
  
  // Normalize all options for matching
  const normalizedOptions = options.map(o => o.toLowerCase().trim());
  
  // Detecteer welke categorieën aanwezig zijn met bidirectionele matching
  const detectedCategories: Array<{ 
    categoryKey: string; 
    matchedOption: string; 
    originalOption: string;
    info: typeof optionCategories[string] 
  }> = [];
  
  for (const [categoryKey, categoryInfo] of Object.entries(optionCategories)) {
    for (const alias of categoryInfo.aliases) {
      const aliasLower = alias.toLowerCase();
      
      // Zoek een match in de opties
      const matchIndex = normalizedOptions.findIndex(opt => {
        // Exacte match
        if (opt === aliasLower) return true;
        
        // Optie bevat alias (bijv. "premium audio system" bevat "audio")
        if (opt.includes(aliasLower) && aliasLower.length >= 3) return true;
        
        // Alias bevat optie (bijv. "panorama roof" bevat "roof")
        if (aliasLower.includes(opt) && opt.length >= 3) return true;
        
        return false;
      });
      
      if (matchIndex !== -1) {
        // Check of deze categorie nog niet gedetecteerd is
        if (!detectedCategories.some(d => d.categoryKey === categoryKey)) {
          detectedCategories.push({
            categoryKey,
            matchedOption: normalizedOptions[matchIndex],
            originalOption: options[matchIndex],
            info: categoryInfo
          });
          console.log(`✅ Category "${categoryKey}" matched via alias "${alias}" for option "${options[matchIndex]}"`);
        }
        break; // Stop na eerste match per categorie
      }
    }
  }

  // Filter EV-specifieke opties als het geen EV is
  const isEV = fuelType?.toLowerCase().includes('elektr') || 
               fuelType?.toLowerCase().includes('ev') ||
               fuelType?.toLowerCase().includes('electric');
  
  const filteredDetected = detectedCategories.filter(d => 
    d.categoryKey !== 'ev_range' || isEV
  );

  let section = '';
  
  // GEDETECTEERDE WAARDE-BEPALENDE OPTIES
  section += '**🔍 GEDETECTEERDE WAARDE-BEPALENDE OPTIES:**\n';
  
  if (filteredDetected.length > 0) {
    filteredDetected.forEach(({ originalOption, info }) => {
      section += `- ${info.emoji} **${info.label}:** "${originalOption}" (${info.valueImpact})\n`;
    });
    
    // Bereken totale potentiële meerwaarde
    section += `\n📊 **Totaal ${filteredDetected.length} waarde-bepalende opties gedetecteerd**\n`;
  } else {
    section += '- ❌ Geen premium waarde-bepalende opties automatisch gedetecteerd\n';
  }
  
  // Specifiek PANORAMADAK highlighten (meest gevraagd)
  const hasPanorama = filteredDetected.some(d => d.categoryKey === 'roof');
  section += `\n🌤️ **PANORAMADAK:** ${hasPanorama ? '✅ JA AANWEZIG' : '❌ NIET GEDETECTEERD'}\n`;
  
  // ALLE opties tonen voor volledig beeld aan AI
  section += `\n**📋 ALLE ${options.length} GESELECTEERDE JP CARS OPTIES:**\n`;
  section += options.map(opt => `  • ${opt}`).join('\n');
  
  // Instructie voor AI
  section += `\n\n⚠️ **INSTRUCTIE:** Bovenstaande opties komen rechtstreeks van JP Cars.\n`;
  section += `Interpreteer ze correct - bijv. "ST-Line" = sport pakket, "roof" = panoramadak, "winter pack" = winterpakket.\n`;
  section += `Opties die niet automatisch zijn gecategoriseerd kunnen OOK waarde toevoegen - gebruik je handelaarservaring!\n`;
  
  console.log(`📊 Detected ${filteredDetected.length} value-adding categories:`, 
    filteredDetected.map(d => d.categoryKey).join(', '));
  
  return section;
}

// Lesson with market context for deeper learning
interface LessonWithContext {
  brand: string;
  model: string;
  vehicleMileage: number;
  vehicleBuildYear: number;
  userReasoning: string;
  lesson: string;
  aiPurchasePrice: number;
  userSuggestedPrice?: number | null;
  marketContext: string; // Formatted market listings at the time
  jpCarsValue?: number | null;
}

// Analyze reasoning patterns from enhanced feedback with market context
function analyzeReasoningPatterns(feedback: FeedbackItem[]): {
  listingLessons: LessonWithContext[];
  kmCorrectionLessons: LessonWithContext[];
  marketLessons: LessonWithContext[];
  positiveExamples: Array<{ vehicle: string; reasoning: string; marketContext: string }>;
} {
  const listingLessons: LessonWithContext[] = [];
  const kmCorrectionLessons: LessonWithContext[] = [];
  const marketLessons: LessonWithContext[] = [];
  const positiveExamples: Array<{ vehicle: string; reasoning: string; marketContext: string }> = [];
  
  // Helper to format market context
  const formatMarketContext = (item: FeedbackItem): string => {
    if (!item.portal_listings || item.portal_listings.length === 0) {
      return 'Geen marktdata beschikbaar';
    }
    return item.portal_listings.slice(0, 3).map(l => 
      `€${l.price.toLocaleString('nl-NL')} | ${l.mileage.toLocaleString('nl-NL')} km | ${l.buildYear}`
    ).join(' | ');
  };
  
  feedback.forEach(item => {
    const marketContext = formatMarketContext(item);
    
    // Process feedback with user reasoning (the most valuable learning data)
    if (item.user_reasoning) {
      const lessonBase: LessonWithContext = {
        brand: item.vehicle_brand,
        model: item.vehicle_model,
        vehicleMileage: item.vehicle_mileage,
        vehicleBuildYear: item.vehicle_build_year,
        userReasoning: item.user_reasoning,
        lesson: `Bij ${item.vehicle_brand}: ${item.user_reasoning}`,
        aiPurchasePrice: item.ai_purchase_price,
        userSuggestedPrice: item.user_suggested_price,
        marketContext,
        jpCarsValue: item.jpcars_value,
      };
      
      if (item.correction_type === 'listing' || item.feedback_type === 'listing_niet_herkend' || item.feedback_type === 'verkeerde_referentie') {
        listingLessons.push(lessonBase);
      } else if (item.correction_type === 'km' || item.feedback_type === 'km_correctie_fout') {
        kmCorrectionLessons.push(lessonBase);
      } else if (item.correction_type === 'markt' || item.feedback_type === 'markt_verkeerd_ingeschat') {
        marketLessons.push(lessonBase);
      }
    }
    
    // Collect positive examples to learn what works
    if (item.feedback_type === 'goede_taxatie') {
      positiveExamples.push({
        vehicle: `${item.vehicle_brand} ${item.vehicle_model}`,
        reasoning: item.notes || 'Correcte taxatie',
        marketContext,
      });
    }
  });
  
  return { listingLessons, kmCorrectionLessons, marketLessons, positiveExamples };
}

function buildFeedbackLearningSection(feedback: FeedbackItem[]): string {
  if (!feedback || feedback.length === 0) {
    return '';
  }

  // Analyze feedback patterns
  const feedbackByType: Record<string, number> = {};
  const feedbackByBrand: Record<string, { type: string; count: number }[]> = {};
  
  feedback.forEach(item => {
    // Count by type
    feedbackByType[item.feedback_type] = (feedbackByType[item.feedback_type] || 0) + 1;
    
    // Group by brand
    if (!feedbackByBrand[item.vehicle_brand]) {
      feedbackByBrand[item.vehicle_brand] = [];
    }
    const existing = feedbackByBrand[item.vehicle_brand].find(f => f.type === item.feedback_type);
    if (existing) {
      existing.count++;
    } else {
      feedbackByBrand[item.vehicle_brand].push({ type: item.feedback_type, count: 1 });
    }
  });

  // Analyze reasoning patterns (NEW - the key to reasoning-based learning)
  const reasoningPatterns = analyzeReasoningPatterns(feedback);

  // Build learning context string
  let learningSection = `
---

## 🧠 FEEDBACK LEARNING - DENKWIJZE AANPASSINGEN

Je hebt ${feedback.length} feedback items ontvangen. Hieronder de patronen die je MOET meenemen in je advies:

**Algemene Feedback Verdeling:**
`;

  Object.entries(feedbackByType).forEach(([type, count]) => {
    const percentage = Math.round((count / feedback.length) * 100);
    let interpretation = '';
    
    switch(type) {
      case 'te_hoog':
        interpretation = '→ Je adviseert vaak te hoge prijzen. Wees CONSERVATIEVER.';
        break;
      case 'te_laag':
        interpretation = '→ Je adviseert vaak te lage prijzen. Je mag OPTIMISTISCHER zijn.';
        break;
      case 'te_voorzichtig':
        interpretation = '→ Je bent te voorzichtig met "kopen" adviezen.';
        break;
      case 'te_agressief':
        interpretation = '→ Je adviseert te snel "kopen". Wees kritischer.';
        break;
      case 'goede_taxatie':
        interpretation = '→ Goed gedaan! Dit was een correcte inschatting.';
        break;
      case 'listing_niet_herkend':
        interpretation = '→ Let beter op welke listings je als referentie gebruikt.';
        break;
      case 'verkeerde_referentie':
        interpretation = '→ Kies zorgvuldiger welke listing je als primaire referentie gebruikt.';
        break;
      case 'km_correctie_fout':
        interpretation = '→ Pas je kilometerstand-correcties aan.';
        break;
      case 'uitvoering_correctie_fout':
        interpretation = '→ Waardeer uitrustingsniveaus nauwkeuriger.';
        break;
      case 'markt_verkeerd_ingeschat':
        interpretation = '→ Analyseer de marktdynamiek beter.';
        break;
      default:
        interpretation = '';
    }
    
    learningSection += `- ${type}: ${count}x (${percentage}%) ${interpretation}\n`;
  });

  // Add reasoning-based lessons WITH MARKET CONTEXT (the key learning)
  if (reasoningPatterns.listingLessons.length > 0) {
    learningSection += `
**🔍 LESSEN OVER LISTINGS HERKENNEN (met marktcontext):**
${reasoningPatterns.listingLessons.slice(0, 5).map((l, i) => 
  `${i + 1}. **${l.brand} ${l.model} (${l.vehicleBuildYear}, ${l.vehicleMileage.toLocaleString('nl-NL')} km)**
   - AI adviseerde: €${l.aiPurchasePrice.toLocaleString('nl-NL')} inkoop${l.jpCarsValue ? ` (JP Cars: €${l.jpCarsValue.toLocaleString('nl-NL')})` : ''}
   ${l.userSuggestedPrice ? `- Gebruiker suggereerde: €${l.userSuggestedPrice.toLocaleString('nl-NL')}` : ''}
   - Gebruiker uitleg: "${l.userReasoning}"
   
   📊 **Markt op dat moment:** ${l.marketContext}
   
   → **Les:** ${l.lesson}`
).join('\n\n')}
`;
  }

  if (reasoningPatterns.kmCorrectionLessons.length > 0) {
    learningSection += `
**📏 LESSEN OVER KM-CORRECTIES (met marktcontext):**
${reasoningPatterns.kmCorrectionLessons.slice(0, 3).map((l, i) =>
  `${i + 1}. **${l.brand} ${l.model} (${l.vehicleBuildYear}, ${l.vehicleMileage.toLocaleString('nl-NL')} km)**
   - AI adviseerde: €${l.aiPurchasePrice.toLocaleString('nl-NL')}
   ${l.userSuggestedPrice ? `- Gebruiker suggereerde: €${l.userSuggestedPrice.toLocaleString('nl-NL')}` : ''}
   - Uitleg: "${l.userReasoning}"
   
   📊 **Markt op dat moment:** ${l.marketContext}
   
   → Begrijp WAAROM de km-correctie niet klopte door te kijken naar de prijzen/km's hierboven.`
).join('\n\n')}
`;
  }

  if (reasoningPatterns.marketLessons.length > 0) {
    learningSection += `
**📊 LESSEN OVER MARKTINSCHATTING (met marktcontext):**
${reasoningPatterns.marketLessons.slice(0, 3).map((l, i) =>
  `${i + 1}. **${l.brand} ${l.model} (${l.vehicleBuildYear}, ${l.vehicleMileage.toLocaleString('nl-NL')} km)**
   - AI adviseerde: €${l.aiPurchasePrice.toLocaleString('nl-NL')}${l.jpCarsValue ? ` (JP Cars: €${l.jpCarsValue.toLocaleString('nl-NL')})` : ''}
   ${l.userSuggestedPrice ? `- Gebruiker suggereerde: €${l.userSuggestedPrice.toLocaleString('nl-NL')}` : ''}
   - Uitleg: "${l.userReasoning}"
   
   📊 **Markt op dat moment:** ${l.marketContext}
   
   → Analyseer de discrepantie tussen AI advies en marktdata hierboven.`
).join('\n\n')}
`;
  }

  // Add positive examples with market context - what worked well
  if (reasoningPatterns.positiveExamples.length > 0) {
    learningSection += `
**✅ WAT GOED WERKTE (behoud deze denkwijze):**
${reasoningPatterns.positiveExamples.slice(0, 3).map((ex, i) =>
  `${i + 1}. ${ex.vehicle}: ${ex.reasoning}
   📊 Markt: ${ex.marketContext}`
).join('\n')}
`;
  }

  // Brand-specific patterns
  const brandPatterns = Object.entries(feedbackByBrand)
    .filter(([_, items]) => items.length >= 2)
    .map(([brand, items]) => {
      const dominantFeedback = items.sort((a, b) => b.count - a.count)[0];
      return { brand, feedback: dominantFeedback };
    })
    .filter(p => p.feedback.count >= 2);

  if (brandPatterns.length > 0) {
    learningSection += `
**Merk-specifieke Patronen:**
`;
    brandPatterns.forEach(({ brand, feedback: fb }) => {
      let advice = '';
      switch(fb.type) {
        case 'te_hoog':
          advice = `Bij ${brand} zijn je prijzen vaak te hoog. Corrigeer -5% t.o.v. je normale berekening.`;
          break;
        case 'te_laag':
          advice = `Bij ${brand} onderschat je de markt. Corrigeer +5% t.o.v. je normale berekening.`;
          break;
        case 'te_voorzichtig':
          advice = `Bij ${brand} ben je te voorzichtig. Dit merk verkoopt goed, durf "kopen" te adviseren.`;
          break;
        case 'te_agressief':
          advice = `Bij ${brand} ben je te positief. Wees kritischer bij dit merk.`;
          break;
      }
      learningSection += `- **${brand}**: ${fb.count}x "${fb.type}" → ${advice}\n`;
    });
  }

  // Recent specific examples with reasoning
  const recentWithReasoning = feedback.filter(f => f.user_reasoning).slice(0, 3);
  if (recentWithReasoning.length > 0) {
    learningSection += `
**Recente Feedback met Uitleg:**
`;
    recentWithReasoning.forEach((item, i) => {
      learningSection += `${i + 1}. ${item.vehicle_brand} ${item.vehicle_model}: "${item.feedback_type}"
   - AI advies: €${item.ai_purchase_price?.toLocaleString('nl-NL')} inkoop → €${item.ai_selling_price?.toLocaleString('nl-NL')} verkoop
   - Gebruiker zegt: "${item.user_reasoning}"
   ${item.user_suggested_price ? `- Gebruiker suggereerde: €${item.user_suggested_price.toLocaleString('nl-NL')}` : ''}
   ${item.correction_type ? `- Type correctie: ${item.correction_type}` : ''}
`;
    });
  }

  learningSection += `
**⚠️ ACTIE:** Gebruik deze lessen om je DENKWIJZE aan te passen, niet alleen je getallen! 
Als je consistent feedback krijgt over bepaalde merken, uitvoeringen of markten, pas dan je 
MANIER VAN DENKEN aan - niet alleen de prijscorrectie.
`;

  return learningSection;
}

function buildTaxatiePrompt(input: TaxatieRequest): string {
  const stockDays = input.jpCarsData.stockStats?.avgDays;
  const salesDays = input.jpCarsData.salesStats?.avgDays;
  const stockCount = input.jpCarsData.stockStats?.count || 0;
  const salesCount = input.jpCarsData.salesStats?.count || 0;

  // Add feedback learning section if available
  const feedbackSection = buildFeedbackLearningSection(input.feedbackHistory || []);

  return `# ROL & DOEL

Je bent een zeer ervaren en slimme inkoper bij Autocity. Je bent geen data-analist, maar een HANDELAAR. 
Je doel is niet om de perfecte analyse te maken, maar om een praktisch en winstgevend inkoopadvies te geven.

**Jouw Mantra:** "Winst maak je bij de inkoop. Omloopsnelheid is koning."
${feedbackSection}
---

# JOUW DENKPROCES (VOLG EXACT DEZE 6 STAPPEN)

## Stap 1: Oriëntatie - Wat is de globale waarde?

Kijk naar de JP Cars Waarde. Dit is je startpunt, je kompas.

**JP Cars Data:**
- Totaalwaarde: €${input.jpCarsData.totalValue?.toLocaleString('nl-NL') || 'n.v.t.'}
- Range: €${input.jpCarsData.range?.min?.toLocaleString('nl-NL') || '?'} - €${input.jpCarsData.range?.max?.toLocaleString('nl-NL') || '?'}
- Courantheid: ${input.jpCarsData.courantheid || 'onbekend'}
- APR (prijspositie): ${input.jpCarsData.apr || '?'}/5
- ETR (omloopsnelheid): ${input.jpCarsData.etr || '?'}/5
${stockCount > 0 ? `- Voorraad markt: ${stockCount} auto's${stockDays ? `, gemiddeld ${Math.round(stockDays)} dagen op voorraad` : ''}` : ''}
${salesCount > 0 ? `- Verkocht: ${salesCount} auto's${salesDays ? `, gemiddeld ${Math.round(salesDays)} dagen tot verkoop` : ''}` : ''}

Formuleer je eerste hypothese: "JP Cars zegt dat deze auto rond de €${input.jpCarsData.totalValue?.toLocaleString('nl-NL') || '?'} waard is."

---

## Stap 2: Realiteitscheck - Wat is de ÉCHTE marktprijs?

Dit is de BELANGRIJKSTE stap. De portal data is de waarheid. Wat staat er NU te koop?

**Portal Analyse:**
- Aantal gevonden: ${input.portalAnalysis.listingCount || 0}
- Laagste prijs: €${input.portalAnalysis.lowestPrice?.toLocaleString('nl-NL') || 'n.v.t.'}
- Mediaan prijs: €${input.portalAnalysis.medianPrice?.toLocaleString('nl-NL') || 'n.v.t.'}
- Hoogste prijs: €${input.portalAnalysis.highestPrice?.toLocaleString('nl-NL') || 'n.v.t.'}

**Listings (gesorteerd op prijs):**
${input.portalAnalysis.listings?.slice(0, 12).map((l, i) => 
  `${i + 1}. ${l.title}
     Prijs: €${l.price?.toLocaleString('nl-NL')} | KM: ${l.mileage?.toLocaleString('nl-NL')} | Jaar: ${l.buildYear}
     ${l.url ? `URL: ${l.url}` : ''}`
).join('\n\n') || 'Geen listings beschikbaar'}

**KRITIEK: Identificeer de VLOER VAN DE MARKT**
Wat is de prijs van de goedkoopste, vergelijkbare, SERIEUZE aanbieder? 
- Negeer auto's met schade
- Negeer auto's met onlogisch hoge km
- Negeer duidelijk afwijkende specificaties
Dit is je belangrijkste ankerpunt!

**Vergelijk JP Cars met de Markt:**
Komt de JP Cars waarde (€${input.jpCarsData.totalValue?.toLocaleString('nl-NL') || '?'}) overeen met wat je in de portalen ziet?
- Is JP Cars te optimistisch?
- Is JP Cars te pessimistisch?
- Of klopt het aardig?

---

## Stap 3: Nuance & Ervaring - De waarde van uitrusting inschatten

Je weet dat een exacte kloon zeldzaam is. Je moet MENTAAL CORRIGEREN voor verschillen.

**Te Taxeren Auto:**
- Merk/Model: ${input.vehicleData.brand} ${input.vehicleData.model}
- Uitvoering: ${input.vehicleData.trim || 'Onbekend'}
- Bouwjaar: ${input.vehicleData.buildYear}${input.vehicleData.modelYear && input.vehicleData.modelYear !== input.vehicleData.buildYear ? ` (modeljaar ${input.vehicleData.modelYear})` : ''}
- KM-stand: ${input.vehicleData.mileage?.toLocaleString('nl-NL')} km
- Motor: ${input.vehicleData.power} PK ${input.vehicleData.fuelType}
- Transmissie: ${input.vehicleData.transmission}

**⭐ WAARDE-BEPALENDE OPTIES:**
${buildValueOptionsSection(input.vehicleData.options, input.vehicleData.fuelType)}

**Vergelijkingsregels:**

1. **MOTOR = HARD FILTER**
   De motorvariant is cruciaal. Een andere motor is een ANDERE auto.

2. **UITVOERING = FLEXIBEL**
   Vergelijk verschillende uitrustingsniveaus met elkaar.
   Je WEET dat een sport- of luxe-uitvoering meerwaarde heeft.

3. **REDENEER IN PERCENTAGES, NIET VASTE BEDRAGEN**
   De waarde van een premium pakket is een PERCENTAGE van de autowaarde.
   
   Voorbeeld: "Ik zie een basismodel te koop voor €30.000. De te taxeren auto heeft 
   een significant luxer pakket, wat in deze klasse en leeftijd doorgaans een 
   meerwaarde van 5-8% vertegenwoordigt. Gecorrigeerde referentieprijs: €31.500 - €32.400"

**Correctieregels:**
- Per 10.000 km verschil ≈ 2-3% prijsverschil
- 1 jaar ouder ≈ 8-12% lager
- Hogere uitvoering ≈ +5-10% (afhankelijk van merk/klasse)

---

## Stap 4: Interne Historie - Wat kunnen we leren?

**Autocity Verkoophistorie:**
- Vergelijkbare auto's verkocht afgelopen jaar: ${input.internalComparison.soldLastYear || 0}
- Verkocht B2C: ${input.internalComparison.soldB2C || 0}
- Verkocht B2B: ${input.internalComparison.soldB2B || 0}
- Gemiddelde marge: €${input.internalComparison.averageMargin?.toLocaleString('nl-NL') || 'n.v.t.'}
- Gemiddelde statijd: ${input.internalComparison.averageDaysToSell || 'n.v.t.'} dagen
${input.internalComparison.averageDaysToSell_B2C ? `- Gemiddelde statijd B2C: ${input.internalComparison.averageDaysToSell_B2C} dagen` : ''}

${input.internalComparison.similarVehicles?.length > 0 ? `**Eerder verkochte vergelijkbare auto's:**
${input.internalComparison.similarVehicles.slice(0, 5).map(v => 
  `- ${v.brand} ${v.model} ${v.buildYear} (${v.mileage?.toLocaleString('nl-NL')} km)
    Inkoop: €${v.purchasePrice?.toLocaleString('nl-NL')} → Verkoop: €${v.sellingPrice?.toLocaleString('nl-NL')} = €${v.margin?.toLocaleString('nl-NL')} marge in ${v.daysToSell} dagen (${v.channel})`
).join('\n')}` : 'Geen vergelijkbare auto\'s in historie.'}

---

## Stap 5: Risicoanalyse - Waar kan het misgaan?

Identificeer en benoem de risico's:

**Courantheid & Omloopsnelheid:**
- ETR-score: ${input.jpCarsData.etr || '?'}/5
- ${input.jpCarsData.etr && input.jpCarsData.etr >= 4 ? 'Laag risico - snelle verkoop verwacht' : input.jpCarsData.etr && input.jpCarsData.etr >= 3 ? 'Gemiddeld risico - normale omloop' : input.jpCarsData.etr ? 'Hoog risico - langere statijd verwacht' : 'Onbekend risico'}

**Marktdynamiek:**
- Zijn er minder dan 5 serieuze concurrenten? → DUNNE MARKT risico
- Zijn er onlogische prijsverschillen tussen bouwjaren? → MARKTCORRECTIE risico
- Is de markt dalend voor dit model? → WAARDEDALING risico

---

## Stap 6: Het Inkoopadvies - Terugrekenen vanuit SLIMME Verkoopprijs

**DE FORMULE:**

1. **Bepaal REALISTISCHE VERKOOPPRIJS**
   Baseer op: portal data + uitvoerings-correctie + interne historie

2. **Bereken met 20% BRUTO MARGE**
   Standaard marge om gezonde winst te garanderen.

3. **MAXIMALE INKOOPPRIJS = Verkoopprijs / 1.20**
   Rond af naar logisch, rond getal.

**Voorbeeld:**
- Realistische verkoopprijs: €50.000
- Berekening: €50.000 / 1.20 = €41.667
- Afgerond inkoopadvies: €41.500

---

# OUTPUT INSTRUCTIES

Gebruik de tool om je advies te structureren. Zorg dat:

1. **reasoning** bevat je complete analyse volgens de 6 stappen:
   - Wat zegt JP Cars?
   - Wat zie je in de markt (vloerprijs)?
   - Hoe vergelijk je uitvoering/km/jaar?
   - Wat leert de historie?
   - Welke risico's zie je?
   - Hoe kom je tot je prijs?

2. **recommendedSellingPrice** is de realistische verkoopprijs

3. **recommendedPurchasePrice** = recommendedSellingPrice / 1.20 (afgerond)

4. **targetMargin** = recommendedSellingPrice - recommendedPurchasePrice

5. **riskFactors** bevat concrete risico's (dunne markt, dalende prijzen, etc.)

6. **opportunities** bevat kansen (snelle verkoop, populair model, etc.)`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('❌ OPENAI_API_KEY not configured');
      throw new Error('OpenAI API key not configured');
    }

    const input: TaxatieRequest = await req.json();
    console.log('📊 Taxatie request received:', {
      vehicle: `${input.vehicleData.brand} ${input.vehicleData.model}`,
      trim: input.vehicleData.trim,
      jpCarsValue: input.jpCarsData?.totalValue,
      listingCount: input.portalAnalysis?.listingCount,
      lowestPrice: input.portalAnalysis?.lowestPrice,
      feedbackCount: input.feedbackHistory?.length || 0
    });

    const prompt = buildTaxatiePrompt(input);
    console.log('🤖 Sending to OpenAI with learning context...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: `Je bent een ervaren auto-inkoper bij Autocity. Je denkt als een HANDELAAR, niet als een data-analist.

Jouw kernprincipes:
- Winst maak je bij de INKOOP
- Omloopsnelheid is belangrijker dan maximale marge
- De marktvloer (laagste serieuze concurrent) is je ankerpunt
- Standaard marge = 20% op verkoopprijs
- Redeneer in percentages bij uitrustingsverschillen

BELANGRIJK: Je LEERT van feedback! Als je feedback krijgt dat je te hoog of te laag adviseert, pas dan je toekomstige adviezen aan.`
          },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_taxatie_advice',
            description: 'Genereer gestructureerd taxatie-advies volgens de 6-stappen methodiek',
            parameters: {
              type: 'object',
              properties: {
                recommendation: {
                  type: 'string',
                  enum: ['kopen', 'niet_kopen', 'twijfel'],
                  description: 'Eindadvies: kopen (goede deal), niet_kopen (te duur/risicovol), twijfel (grenseval)'
                },
                recommendedSellingPrice: {
                  type: 'number',
                  description: 'Realistische verkoopprijs gebaseerd op marktvloer + correcties'
                },
                recommendedPurchasePrice: {
                  type: 'number',
                  description: 'Maximale inkoopprijs = verkoopprijs / 1.20 (afgerond)'
                },
                expectedDaysToSell: {
                  type: 'number',
                  description: 'Verwachte statijd in dagen, gebaseerd op ETR en historie'
                },
                targetMargin: {
                  type: 'number',
                  description: 'Doelmarge = verkoopprijs - inkoopprijs (±20%)'
                },
                reasoning: {
                  type: 'string',
                  description: 'Complete analyse volgens 6-stappen: JP Cars waarde → Marktvloer → Uitvoering/KM correcties → Historie → Risicos → Prijsberekening. Vermeld ook of je je advies hebt aangepast op basis van feedback.'
                },
                jpcarsDeviation: {
                  type: 'string',
                  description: 'Korte uitleg: Hoe verhoudt je advies zich tot JP Cars? Bijv: "5% lager dan JP Cars omdat marktvloer lager ligt"'
                },
                riskFactors: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Concrete risicofactoren: dunne markt, dalende prijzen, lage ETR, etc.'
                },
                opportunities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Kansen: populair model, hoge ETR, weinig concurrentie in segment, etc.'
                },
                marketFloorPrice: {
                  type: 'number',
                  description: 'De geïdentificeerde marktvloer: laagste prijs van serieuze concurrent'
                },
                marketFloorReasoning: {
                  type: 'string',
                  description: 'Waarom is dit de marktvloer? Welke listing, en waarom is deze relevant?'
                },
                feedbackAdjustment: {
                  type: 'string',
                  description: 'Optioneel: Beschrijf hoe je dit advies hebt aangepast op basis van eerdere feedback'
                }
              },
              required: ['recommendation', 'recommendedSellingPrice', 'recommendedPurchasePrice', 'expectedDaysToSell', 'targetMargin', 'reasoning', 'riskFactors', 'opportunities']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_taxatie_advice' } },
        temperature: 0.3,
        max_tokens: 3000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit bereikt. Probeer het over enkele seconden opnieuw.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'generate_taxatie_advice') {
      console.error('❌ No valid tool call in response');
      throw new Error('Invalid response from AI');
    }

    const advice = JSON.parse(toolCall.function.arguments);
    console.log('📋 Taxatie advice generated with learning:', {
      recommendation: advice.recommendation,
      sellingPrice: advice.recommendedSellingPrice,
      purchasePrice: advice.recommendedPurchasePrice,
      margin: advice.targetMargin,
      marketFloor: advice.marketFloorPrice,
      feedbackAdjustment: advice.feedbackAdjustment || 'none'
    });

    return new Response(JSON.stringify({ success: true, advice }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in taxatie-ai-advice:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Onbekende fout' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
