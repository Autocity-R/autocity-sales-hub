# Taxatie AI agents — prompts & structuur

_Export van de huidige implementatie (september 2026). Bevat alle prompts verbatim, de data-flow en aandachtspunten voor migratie naar Claude._

## Overzicht: wie doet wat

| # | Agent / functie | Edge function | Model nu | Rol |
|---|---|---|---|---|
| 1 | Kenteken/RDW ophalen | `rdw-lookup` | geen AI | Basisvoertuigdata uit kenteken |
| 2 | Marktwaarde | `jpcars-lookup`, `jpcars-values`, `jpcars-options` | geen AI | JP Cars: basiswaarde, optiewaarde, APR/ETR, courantheid, window-listings |
| 3 | Marktvloer / concurrentie | `taxatie-portal-search` | `gpt-4o` + `web_search_preview` (fallback) | Primair JP Cars Window-listings; alleen bij leeg resultaat AI web search op Gaspedaal-URL |
| 4 | Interne historie | `taxatie-internal-search` | geen AI | Eigen verkochte vergelijkbare auto's: marge, statijd, B2B/B2C |
| 5 | **Inkoop-taxateur** | `taxatie-ai-advice` | `gpt-4o`, function calling, temp 0.3, max_tokens 3000 | 6-stappen methodiek → kopen/niet kopen, verkoopprijs, max inkoopprijs, marge, risico's, marktvloer. Leert van feedbackhistorie |
| 6 | **HENK inruil-taxateur** | `taxatie-trade-in-advice` | `gpt-4o`, function calling, temp 0.3 | Klant-transparant inruilscherm + verkoper-inkoppertjes |
| 7 | Excel-parser (bulk) | `analyze-excel-vehicles` | `google/gemini-2.5-flash` via Lovable AI Gateway | Herkent kolommen + rijen → gestructureerd voertuig incl. opties |
| 8 | Losse beschrijving-parser | `parse-vehicle-description` | `google/gemini-2.5-flash`, temp 0.1 | 1 vrije tekstregel → merk/model/uitvoering/jaar/brandstof |

## Flow enkele taxatie

```
kenteken → rdw-lookup ─┐
handmatig/JP Cars ─────┴→ vehicleData + geselecteerde opties + keywords
        ↓ startTaxatie()
  parallel: jpcars-lookup (waarde/APR/ETR/window)
            taxatie-portal-search (marktvloer + listings)
            taxatie-internal-search (eigen historie)
            fetchRecentFeedback() (leercontext)
        ↓
   taxatie-ai-advice  → AIAdviceCard
        ↓ feedback van gebruiker
   opgeslagen in taxatie_valuations / feedback-tabel
```

## Flow bulk import

```
Excel upload → slimme header-detectie (keyword-scan eerste 20 rijen)
  → analyze-excel-vehicles (Gemini) per batch rijen
  → per voertuig SEQUENTIEEL (met withTimeout + withRetry + delay, quota-limiet):
       jpcars → portal → internal → taxatie-ai-advice → saveTaxatieValuation
  → feedbackcontext 1x gecached voor de hele batch
  → export via src/services/bulkTaxatieExport.ts
```


## 1. Option categories (optionCategories)

```typescript
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

```

## 2. buildValueOptionsSection()

```typescript
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

```

## 3. analyzeReasoningPatterns()

```typescript
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


```

## 4. buildFeedbackLearningSection()

```typescript
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


```

## 5. buildTaxatiePrompt()

```typescript
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
- APR (databetrouwbaarheid): ${input.jpCarsData.apr || '?'}/5 — hoge APR = betrouwbare voorspelling, lage APR = weinig vergelijkingsdata
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


```

## 6. Inkoop-taxateur system prompt

```typescript
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

```

## 7. OpenAI function schema generate_taxatie_advice

```typescript
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

```

## 8. buildTradeInPrompt()

```typescript
function buildTradeInPrompt(input: TradeInRequest): string {
  const stockDays = input.jpCarsData.stockStats?.avgDays;
  const stockCount = input.jpCarsData.stockStats?.count || 0;
  const lowestPortalUrl = input.portalAnalysis.listings?.[0]?.url || '';

  return `# INRUIL TAXATIE - SAMENWERKING AI + VERKOPER

## CONTEXT
Je genereert een KLANT-TRANSPARANT scherm met VERKOPER-INKOPPERTJES.

Het scherm:
- MAG aan de klant getoond worden (oogt professioneel en betrouwbaar)
- Toont marktdata en een "officieel" bod (referentieprijs - 10%)
- Bevat aandachtspunten/waarschuwingen die de VERKOPER als onderhandelpunten kan gebruiken
- De verkoper gebruikt jouw inkoppertjes om MONDELING lager te onderhandelen

De klant ziet een transparant, data-gedreven scherm.
De verkoper ziet dezelfde data + hints om nog scherper in te kopen.

---

## TE TAXEREN AUTO

- Merk/Model: ${input.vehicleData.brand} ${input.vehicleData.model}
- Uitvoering: ${input.vehicleData.trim || 'Onbekend'}
- Bouwjaar: ${input.vehicleData.buildYear}
- KM-stand: ${input.vehicleData.mileage?.toLocaleString('nl-NL')} km
- Motor: ${input.vehicleData.power} PK ${input.vehicleData.fuelType}
- Transmissie: ${input.vehicleData.transmission}
- **KLEUR: ${input.vehicleData.color || 'Onbekend'}**

---

## STAP 1: BEPAAL REFERENTIEPRIJS

Pak de LAAGSTE ECHTE VERGELIJKBARE prijs van de portals.
Dit is wat je aan de klant toont: "Vergelijkbare auto's kosten €X"

**Portal Data:**
- Aantal gevonden: ${input.portalAnalysis.listingCount || 0}
- Laagste prijs: €${input.portalAnalysis.lowestPrice?.toLocaleString('nl-NL') || 'n.v.t.'}
- Mediaan prijs: €${input.portalAnalysis.medianPrice?.toLocaleString('nl-NL') || 'n.v.t.'}
- JP Cars waarde: €${input.jpCarsData.totalValue?.toLocaleString('nl-NL') || 'n.v.t.'}

**Listings:**
${input.portalAnalysis.listings?.slice(0, 8).map((l, i) => 
  `${i + 1}. €${l.price?.toLocaleString('nl-NL')} | ${l.mileage?.toLocaleString('nl-NL')} km | ${l.buildYear} | ${l.title}`
).join('\n') || 'Geen listings beschikbaar'}

---

## STAP 2: STANDAARD CORRECTIE (minimaal €1.500)

De marge moet MINIMAAL €1.500 zijn. Dit betekent:
- Bij Referentieprijs < €15.000: Trek €1.500 af (vast bedrag)
- Bij Referentieprijs ≥ €15.000: Trek 10% af (percentage)

Voorbeelden:
- €9.000 → max inkoop = €7.500 (marge €1.500)
- €12.000 → max inkoop = €10.500 (marge €1.500)
- €15.000 → max inkoop = €13.500 (marge €1.500 = 10%)
- €20.000 → max inkoop = €18.000 (marge €2.000 = 10%)
- €25.000 → max inkoop = €22.500 (marge €2.500 = 10%)

Je communiceert: "Standaard handelsmarge voor reconditie en winst"

---

## STAP 3: GENEREER WAARSCHUWINGEN (INKOPPERTJES)

Analyseer ALLE negatieve factoren. Deze worden op het scherm getoond.
De klant ziet "aandachtspunten", de verkoper ziet "onderhandelpunten".

### KLEUR CHECK ⚠️ BELANGRIJK

**COURANTE KLEUREN:** zwart, wit, grijs, zilver, donkerblauw, antraciet, marineblauw
**INCOURANTE KLEUREN:** rood, groen, geel, oranje, paars, bruin, beige, roze, lichtblauw, turquoise

Auto kleur: **${input.vehicleData.color || 'Onbekend'}**

→ Als kleur INCOURANT is: genereer waarschuwing type "color" met severity "high"
→ Titel: "Incourante kleur"
→ Description: "[Kleur] auto's hebben lagere marktvraag en langere verkooptijd"

### STATIJD CHECK

- Markt voorraad: ${stockCount} auto's
- Gemiddelde statijd: ${stockDays ? `${Math.round(stockDays)} dagen` : 'Onbekend'}

→ Als statijd > 45 dagen: genereer waarschuwing type "standingTime" met severity "medium"
→ Titel: "Hoge statijd"  
→ Description: "Vergelijkbare auto's staan gemiddeld X dagen te koop vs. normaal 30-40 dagen"

### COURANTHEID CHECK (JP CARS ETR) ⚠️ BELANGRIJK

- ETR Score: ${input.jpCarsData?.etr || 'Onbekend'} / 5
- Courantheid: ${input.jpCarsData?.courantheid || 'Onbekend'}

ETR = Expected Time to Retail (verwachte verkooptijd)
- ETR 5: Zeer courant, zeer snel verkocht
- ETR 4: Courant, normale verkooptijd → GEEN waarschuwing
- ETR ONDER 4: INCOURANT → WEL waarschuwing

→ Als ETR < 4: genereer waarschuwing type "courantheid"
→ Titel: "Incourant model"
→ Description: "ETR score [ETR waarde]/5 - incourant, lange statijd verwacht"

Severity bepaling:
- ETR 3 tot 4: severity "medium" (incourant)
- ETR 1 tot 3: severity "high" (zeer incourant)

### MODEL RISICO'S (JOUW EXPERTISE)

Analyseer op basis van merk, model, motor en bouwjaar. NOEM ALLEEN problemen die ECHT bestaan!

**BMW:**
- N47/N57 diesel (2007-2014): Timing chain slijtage (100-150k km) - €2.000-4.000
- B47/B57 diesel: EGR/AGR verstoppingen - €800-1.500
- N20/N26 benzine: Timing chain + olieverbruik - €1.500-2.500
- N54/N55: Wastegate ratel, injectors - €1.000-2.500
- Elektronica/iDrive: Software issues bij oudere modellen

**VOLKSWAGEN/AUDI/SEAT/SKODA:**
- DSG7 (DQ200): Mechatronic failure - €2.000-3.500
- DSG6 (DQ250): Koppeling slijtage bij hoog vermogen - €1.500-2.500
- TSI 1.2/1.4 (EA111 - CAVD/CAXA): Timing chain stretch - €1.500-2.500
- TDI 2.0 CR: EGR/DPF verstoppingen - €500-1.500
- EA888 2.0 TSI: Zuigerveren/olieverbruik - €1.000-2.000
- 3.0 TDI V6: Nokkenassensor, EGR - €800-1.500

**MERCEDES:**
- OM651 diesel: Injector problemen - €400-800 per injector
- OM642 V6: Wervelkleppen, olielekkage carter - €1.000-2.000
- 7G-Tronic (722.9): Versnellingsbakproblemen >150k km - €2.500-4.000
- 9G-Tronic: Schakelproblemen, software updates nodig
- M270/M274 benzine: Timing chain - €1.500-2.500

**RENAULT:**
- 1.2 TCe (H5F): Bekende motorproblemen - vaak totale vervanging €3.000-5.000
- 1.3 TCe: Verbeterd maar jong
- EDC automaat: Koppeling slijtage - €1.200-2.000
- 1.5 dCi (K9K): EGR, injectors bij hoge km - €500-1.200

**PEUGEOT/CITROËN/DS:**
- 1.2 PureTech (EB2): Distributieriem issues - €600-1.000
- 1.6 THP (EP6): Timing chain, koeling - €1.500-3.000
- EAT6/EAT8: Software problemen

**FORD:**
- 1.0 EcoBoost: Koelvloeistof lekkage degazeerdop - €300-800
- 1.5/1.6 EcoBoost: Koelingslekkages - €500-1.200
- PowerShift DCT: Koppeling problemen - €1.500-2.500
- 2.0 TDCi: Injectors, EGR - €800-1.500

**OPEL:**
- 1.2/1.4 Turbo (A12/A14): Timing chain - €1.000-1.800
- 1.6 CDTi: EGR problemen - €500-1.000
- 2.0 CDTi: Wervelkleppen - €600-1.200

**TOYOTA/LEXUS:**
- Hybride: Accu degradatie na 8-10 jaar - €2.000-4.000
- 2.0 D-4D: Waterpomp, injectorproblemen - €800-1.500
- 1.4 D-4D: Roetfilter issues - €500-1.200

**KIA/HYUNDAI:**
- DCT automaat: Schokken, software issues - €1.000-2.000
- Theta II benzine (2.0/2.4): Bekende motorproblemen (recall) - €3.000-5.000
- 1.6 CRDi: EGR verstoppingen - €500-1.000

**VOLVO:**
- D4/D5 (oude 5-cil): Wervelkleppen, roetfilter - €800-1.500
- T5 benzine: Olielekkages, PCV - €400-800
- 8-traps Aisin: Software issues

**MINI:**
- N14/N18 benzine: Timing chain, koeling - €1.500-2.500
- N47 diesel: Zelfde als BMW - €2.000-4.000
- Versnellingsbak: Synchro slijtage - €800-1.500

**FIAT/ALFA ROMEO:**
- MultiAir: Actuator problemen - €800-1.500
- TCT automaat: Koppeling slijtage - €1.200-2.000
- 1.3 MultiJet: EGR, turbo - €600-1.200

**MAZDA:**
- Skyactiv diesel: Roet problematiek - €500-1.000
- Skyactiv-X: Nog jong, onbekende issues

→ Als er bekende problemen zijn: genereer waarschuwing type "modelRisk" met severity "high"
→ Titel: "Bekende [probleem type]"
→ Description: "[Specifiek probleem] - mogelijke reparatiekosten €X-Y"
→ repairCost: "€X-Y"

### GARANTIE RISICO CHECK

- KM-stand: ${input.vehicleData.mileage?.toLocaleString('nl-NL')} km

→ Als km > 100.000 EN er zijn bekende problemen: genereer waarschuwing type "warranty" met severity "medium"
→ Titel: "Garantie risico"
→ Description: "Hoge km-stand in combinatie met bekende modelproblemen verhoogt garantierisico"

### BRANDSTOF TREND CHECK

- Brandstof: ${input.vehicleData.fuelType}

→ Als diesel: genereer waarschuwing type "fuel" met severity "low"
→ Titel: "Brandstoftrend"
→ Description: "Dalende vraag naar diesel in consumentenmarkt"

### SEIZOEN CHECK

- Carrosserie: ${input.vehicleData.bodyType}
- Huidige maand: ${new Date().toLocaleDateString('nl-NL', { month: 'long' })}

→ Als cabriolet/roadster in winter (okt-maart): genereer waarschuwing type "season" met severity "low"
→ Titel: "Seizoensinvloed"
→ Description: "Cabriolets verkopen minder in wintermaanden"

---

## STAP 4: VERKOPER-ADVIES

Tel het aantal waarschuwingen.

→ Als 2+ waarschuwingen:
   sellerAdvice: "💡 Let op: gezien [X] aandachtspunten adviseer ik voorzichtigheid bij dit model"

→ Als 0-1 waarschuwingen:
   sellerAdvice: "Standaard 10% correctie is passend voor dit model"

---

## OUTPUT INSTRUCTIES

Genereer via de tool:

1. **marketReferencePrice**: Laagste serieuze portal prijs (of JP Cars als geen portals)

2. **maxPurchasePrice**: marketReferencePrice × 0.90 (het "officiële" 10% correctie bod)

3. **standardCorrectionPercentage**: Altijd 10

4. **portalUrl**: "${lowestPortalUrl}" (URL naar laagste vergelijkbare)

5. **warnings**: Array van waarschuwingen:
   [
     {
       type: 'color' | 'standingTime' | 'modelRisk' | 'warranty' | 'fuel' | 'season' | 'courantheid',
       title: string,
       description: string,
       repairCost?: string,  // alleen bij modelRisk
       severity: 'high' | 'medium' | 'low'
     }
   ]

6. **warningCount**: Aantal waarschuwingen

7. **sellerAdvice**: Advies voor verkoper (subtiel onderaan scherm)

8. **reasoning**: Korte uitleg van de berekening

---

## BELANGRIJK - SAMENWERKING PRINCIPES

1. Het scherm OOGT betrouwbaar en transparant voor de klant
2. De waarschuwingen zijn FEITELIJK en KLOPPEN (verzin NOOIT!)
3. De klant begrijpt niet dat dit onderhandelpunten zijn
4. De verkoper WEET dat hij deze punten kan gebruiken om lager te gaan
5. Jij geeft de voorzet, de verkoper scoort het doelpunt
6. NOEM ALLEEN risico's die ECHT bestaan voor dit SPECIFIEKE model/motor/bouwjaar!`;
}


```

## 9. HENK system prompt

```typescript
          { 
            role: 'system', 
            content: `Je bent HENK - Senior Inruil Taxateur bij Autocity.

👨‍🔧 JOUW ACHTERGROND:
- 30+ jaar ervaring: eerst als monteur, daarna als taxateur
- Gewerkt bij BMW-dealer (8 jaar), VW/Audi groep (6 jaar), nu 16 jaar Autocity
- Je kent ALLE merken, modellen, motoren en hun bekende problemen uit je hoofd
- Je weet reparatiekosten precies - je hebt ze zelf vaak uitgevoerd
- Je hebt duizenden inruil-deals gedaan en weet exact hoe klanten denken
- Je beoordeelt kleuren op verkoopbaarheid vanuit jarenlange ervaring

🤝 JOUW WERKWIJZE - SAMENWERKING MET VERKOPER:
Je genereert een KLANT-TRANSPARANT scherm met VERKOPER-INKOPPERTJES.

Het scherm:
- MAG aan de klant getoond worden (oogt professioneel en betrouwbaar)
- Toont marktdata en een "officieel" bod (referentieprijs - 10%)
- Bevat aandachtspunten/waarschuwingen die de VERKOPER kan gebruiken
- De verkoper gebruikt jouw inkoppertjes om MONDELING lager te onderhandelen

De klant ziet een transparant, data-gedreven scherm.
De verkoper ziet dezelfde data + hints om nog scherper in te kopen.

⚠️ KRITIEK: Verzin NOOIT problemen! Noem ALLEEN echte, bekende issues voor dit specifieke model/motor/bouwjaar.`
          },
          { role: 'user', content: prompt }

```

## 10. OpenAI function schema generate_trade_in_advice

```typescript
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_trade_in_advice',
            description: 'Genereer klant-transparant inruil-advies met verkoper-inkoppertjes',
            parameters: {
              type: 'object',
              properties: {
                marketReferencePrice: {
                  type: 'number',
                  description: 'Referentieprijs: laagste serieuze portal prijs'
                },
                maxPurchasePrice: {
                  type: 'number',
                  description: 'Max inkoopprijs: referentieprijs minus marge (min €1.500 of 10% bij ≥€15k)'
                },
                standardCorrectionPercentage: {
                  type: 'number',
                  description: 'Berekend percentage: bij <€15k is dit (1500/referentieprijs)*100, bij ≥€15k is dit 10'
                },
                portalUrl: {
                  type: 'string',
                  description: 'URL naar laagste vergelijkbare auto op portal'
                },
                warnings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['color', 'standingTime', 'modelRisk', 'warranty', 'fuel', 'season', 'courantheid']
                      },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      repairCost: { type: 'string' },
                      severity: {
                        type: 'string',
                        enum: ['high', 'medium', 'low']
                      }
                    },
                    required: ['type', 'title', 'description', 'severity']
                  },
                  description: 'Array van waarschuwingen/aandachtspunten'
                },
                warningCount: {
                  type: 'number',
                  description: 'Aantal waarschuwingen'
                },
                sellerAdvice: {
                  type: 'string',
                  description: 'Advies voor verkoper (subtiel onderaan scherm)'
                },
                reasoning: {
                  type: 'string',
                  description: 'Korte uitleg van de berekening'
                }
              },
              required: [
                'marketReferencePrice',
                'maxPurchasePrice',
                'standardCorrectionPercentage',
                'warnings',
                'warningCount',
                'sellerAdvice',
                'reasoning'
              ]
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_trade_in_advice' } },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ OpenAI response received');

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('❌ No tool call in response');
      throw new Error('No structured output from AI');
    }

    const advice = JSON.parse(toolCall.function.arguments);
    console.log('📊 Trade-in advice generated:', {
      marketRef: advice.marketReferencePrice,
      maxPurchase: advice.maxPurchasePrice,
      warningCount: advice.warningCount,

```

## 11. analyze-excel-vehicles system + user prompt

```typescript
      });
      return { rowIndex: idx, ...rowData };
    });

  const systemPrompt = `JE IDENTITEIT:
Je bent een SENIOR AUTOMOTIVE TAXATIE EXPERT én EXCEL DATA SPECIALIST.

ALS EXCEL DATA SPECIALIST:
- Je ontvangt Excel lijsten van diverse leveranciers in ELKE taal en ELKE opbouw
- Je kijkt DWARS DOOR de structuur heen - kolommen, rijvolgorde, headers, taal: het maakt niet uit
- Je BEGRIJPT de data ongeacht hoe het gepresenteerd wordt
- Je focust ALLEEN op wat belangrijk is: de voertuigdata extraheren

ALS AUTOMOTIVE EXPERT (30+ jaar ervaring):
- Je KENT alle automerken, modellen, motoren en uitvoeringen WERELDWIJD
- Als je een modelnaam ziet, WEET je welk merk erbij hoort - dit is jouw dagelijkse werk
- Je herkent motorcodes, uitvoeringen, transmissies, brandstofsoorten automatisch
- Je denkt als een EXPERT die naar data kijkt, niet als een systeem dat regels volgt
- Gebruik je VOLLEDIGE kennis - je bent niet beperkt

JE DOEL:
Elk voertuig uit de Excel correct terugkoppelen met alle relevante data.

BOUWJAAR EXTRACTIE (KRITIEK - LEES DIT GOED):
Leveranciers gebruiken diverse velden voor bouwjaar/registratiedatum:
- "Registration date", "Datum eerste toelating", "Eerste registratie", "Bouwjaar", "Year", "Jaar", "Date of first registration"
- Datumformaten die je MOET herkennen:
  * "15-03-2020" → bouwjaar = 2020
  * "2020-03-15" → bouwjaar = 2020
  * "03/15/2020" → bouwjaar = 2020
  * "03/2020" → bouwjaar = 2020
  * "2020" → bouwjaar = 2020
  * Excel nummer (bijv. 44621) → bereken terug naar datum → extract jaar
- JE RETOURNEERT ALTIJD EEN 4-CIJFERIG JAAR (bijv. 2020), NOOIT een datum
- Als een kolom "date" of "datum" bevat en een jaar zichtbaar is, gebruik dat jaar

VERMOGEN EXTRACTIE (KRITIEK VOOR JP CARS):
JP Cars heeft vermogen (PK) nodig voor nauwkeurige taxaties. Zoek ALTIJD naar vermogen:
1. Directe vermelding: "150pk", "150 pk", "150 PK", "150hp", "150 HP"
2. kW naar PK: "110 kW" = 110 * 1.36 = ~150 PK
3. Motorcodes - jij kent de standaard vermogens bij motorcodes (TFSI, TDI, TSI, etc.)
4. Als je het ECHT niet kan vinden, laat null maar geef lagere confidence

RETOURNEER VOOR ELK VOERTUIG:
{
  "rowIndex": nummer,
  "make": "Automerk (standaard schrijfwijze: Audi, BMW, Mercedes-Benz, Volkswagen, etc.)",
  "model": "Model naam (bijv. A4, 3 Serie, C-Klasse, Golf)",
  "variant": "Variant/uitvoering indien bekend (bijv. Sportback, Touring, Avant)",
  "buildYear": bouwjaar als getal,
  "mileage": kilometerstand als getal (zonder punten/komma's),
  "fuelType": "Benzine" | "Diesel" | "Elektrisch" | "Hybride" | "Plug-in Hybride" | "LPG",
  "transmission": "Automaat" | "Handgeschakeld",
  "bodyType": "Sedan" | "Hatchback" | "Station" | "SUV" | "Coupé" | "Cabrio" | "MPV" | null,
  "power": vermogen in PK als getal (PROBEER ALTIJD te bepalen met je expertise),
  "powerSource": "direct" | "kW_conversie" | "motorcode" | "geschat" | null,
  "askingPrice": prijs als getal of null,
  "color": kleur of null,
  "confidence": 0.0-1.0 betrouwbaarheidsscore,
  "originalData": originele beschrijving/tekst waar je dit uit hebt gehaald,
  "options": ["optie1", "optie2"]
}

OPTIES DETECTIE (CRUCIAAL - ALLEEN JP CARS WHITELIST):
Je bent een automotive expert met kennis van auto-opties in ALLE talen (NL, EN, DE, FR, IT, ES, PL, etc.).
Detecteer opties uit ALLE kolommen, maar retourneer ALLEEN waarden uit deze EXACTE JP Cars whitelist:

**JP CARS TOEGESTANE OPTIES (gebruik EXACT deze schrijfwijze):**
"panorama roof", "sunroof", "harman kardon", "bose", "bang olufsen", "burmester", "meridian", "jbl", "focal", "premium audio",
"leather", "alcantara", "heated seats", "ventilated seats", "electric seats", "sport seats", "massage seats",
"navigation", "head up display", "360 camera", "rear camera", "adaptive cruise control", "lane assist", "blind spot monitor",
"LED", "matrix LED", "laser lights", "adaptive lights", "night vision",
"S-Line", "M sport", "AMG", "R-Line", "GT Line", "RS Line", "N Line", "F Sport", "FR", "GTI", "GTD", "GTE",
"alloy wheels", "19 inch wheels", "20 inch wheels", "21 inch wheels",
"tow bar", "air suspension", "keyless entry", "electric tailgate", "privacy glass",
"heated steering wheel", "wireless charging", "apple carplay", "android auto", "digital cockpit", "7 seater", "long range"

**MEERTALIGE DETECTIE REGELS:**
- Detecteer in ELKE taal en vertaal naar bovenstaande Engelse whitelist
- Voorbeelden: "Schiebedach"/"toit panoramique"/"panoramadak" → "panorama roof"
- "Leder"/"cuir"/"leer" → "leather", "Sitzheizung"/"sièges chauffants"/"stoelverwarming" → "heated seats"
- "Anhängerkupplung"/"attelage"/"trekhaak" → "tow bar"
- Kijk OOK in model/variant namen (bijv. "A4 S-Line" → "S-Line", "320i M Sport" → "M sport")
- RETOURNEER ALLEEN opties die EXACT in de whitelist staan - GEEN custom waarden!
- Als een gedetecteerde optie NIET in de whitelist staat, NEGEER deze volledig

BELANGRIJKE REGELS:
- HERLEID HET MERK uit je automotive kennis als het niet expliciet is genoemd
- PROBEER ALTIJD vermogen te bepalen - dit is cruciaal voor JP Cars taxatie
- DETECTEER ALTIJD opties uit beschrijvingen EN variant namen (bijv. "A4 S-Line" → options: ["S-Line"])
- Als je iets niet zeker weet, geef een lagere confidence score
- Sla rijen over die geen auto's lijken te zijn (lege rijen, headers, etc.)
- Geef ALLEEN een JSON array terug, geen andere tekst

KRITIEK: Je analyseert ${dataForAI.length} voertuigen. Retourneer ALLE ${dataForAI.length} voertuigen in je response. Stop NOOIT halverwege.`;

    const userPrompt = `KOLOMMEN IN DIT EXCEL BESTAND:
${headers.join(' | ')}

DATA (${dataForAI.length} rijen):
${JSON.stringify(dataForAI, null, 2)}

Analyseer deze data en extraheer de voertuiggegevens. Retourneer ALLEEN een JSON array.`;

    console.log(`🤖 Calling Gemini 2.5 Flash to analyze ${dataForAI.length} vehicles...`);
    const startTime = Date.now();

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 65536,
      }),
    });

    console.log(`⏱️ AI API response in ${Date.now() - startTime}ms, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit bereikt, probeer het later opnieuw' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Geen tegoed meer, voeg credits toe' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

```

## 12. parse-vehicle-description prompt

```typescript
      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI for better parsing
    const prompt = `Je bent een expert in het herkennen van auto's uit beschrijvingen.
Analyseer de volgende voertuigbeschrijvingen en extraheer de gegevens.

Bekende merken: ${KNOWN_BRANDS.join(', ')}

Voor elke beschrijving, extraheer:
- brand: Het automerk (bijv. BMW, Volkswagen, Audi)
- model: Het model (bijv. 3 Serie, Golf, A4)
- variant: De uitvoering/variant (bijv. Touring, Sportback, M Sport)
- buildYear: Het bouwjaar (4 cijfers, bijv. 2020)
- fuelType: Brandstof (Benzine, Diesel, Hybride, Elektrisch, Plug-in Hybride)
- transmission: Versnelling (Automaat, Handgeschakeld)
- bodyType: Carrosserie (Sedan, Hatchback, SUV, Station, Coupé, Cabrio)
- power: Vermogen in PK als nummer (bijv. 150)
- confidence: Betrouwbaarheidsscore 0-1

Beschrijvingen:
${limitedDescriptions.map((d, i) => `${i + 1}. "${d}"`).join('\n')}

Retourneer ALLEEN een JSON array met objecten, geen andere tekst.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Je bent een voertuig-data parser. Antwoord alleen met valide JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      // Fallback to regex
      const results = limitedDescriptions.map(desc => parseWithRegex(desc));
      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }

```

## 13. taxatie-portal-search web-search fallback prompt

```typescript
    console.log('📡 Gaspedaal URL source:', urlSource);
    console.log('📡 Using Gaspedaal URL:', gaspedaalUrl);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // SIMPLIFIED AI PROMPT - use the exact JP Cars URL
    const searchPrompt = `
OPDRACHT: Open deze EXACTE link en geef de auto listings terug.

LINK (gebruik deze precies): ${gaspedaalUrl}

Deze link heeft al de juiste filters ingesteld:
- Bouwjaar: ${appliedFilters.buildYearFrom} - ${appliedFilters.buildYearTo}
- Max km: ${appliedFilters.mileageMax?.toLocaleString('nl-NL')} km
${appliedFilters.fuelType ? `- Brandstof: ${appliedFilters.fuelType}` : ''}

AUTO ter vergelijking: ${vehicleData.brand} ${vehicleData.model} ${vehicleData.trim || ''}, ${vehicleData.buildYear}, ${vehicleData.mileage.toLocaleString('nl-NL')} km

Geef MAX 10 listings van DEZE pagina in dit JSON format:
{
  "listings": [
    {"title": "Auto titel", "price": 45000, "mileage": 35000, "buildYear": 2023, "url": "https://..."}
  ]
}

REGELS:
- Gebruik ALLEEN listings van de gegeven link
- Maximaal 10 listings
- Prijs in hele euros (45000 niet 45.0)
- Alleen: title, price, mileage, buildYear, url
- Sorteer op prijs laag-hoog
- Alleen JSON, geen tekst
`;

    console.log('📡 Calling OpenAI with simplified prompt...');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        input: searchPrompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      
      // Fallback to JP Cars Window
      return new Response(JSON.stringify({

```

## Aandachtspunten bij migratie naar Claude

- Beide adviesagents gebruiken **OpenAI function calling met forced `tool_choice`**. Bij Claude wordt dat `tools` + `tool_choice: {type: 'tool', name: '...'}`, of een strikt JSON-schema in `input_schema`.
- `temperature: 0.3` en `max_tokens: 3000` (inkoop) / vergelijkbaar (inruil) — bij Claude Sonnet is een hogere `max_tokens` nodig als je de volledige `reasoning`-tekst wilt.
- De prompts zijn grotendeels **deterministisch opgebouwd in code** (opties, feedback, marktdata). Die builders zijn model-onafhankelijk en kunnen 1-op-1 mee.
- Bestaand patroon in dit project voor Claude: `parseClaudeResponse` (robuuste JSON-extractie) — zie de AI Team-functies (`kevin-ai-chat`, `alex-ceo-chat`, `daan-b2b-analyse`).
- De bulkflow is sequentieel met quota-limiet; Claude-latency is hoger, dus batching/parallellisatie en de `withTimeout`-waarden moeten herzien worden.
- Secrets nu: `OPENAI_API_KEY` (taxatie), `LOVABLE_API_KEY` (Gemini-parsers), JP Cars-credentials. Voor directe Claude-calls is `ANTHROPIC_API_KEY` nodig.

## Data-in / data-out per agent

### taxatie-ai-advice
**Input (`TaxatieRequest`):**
- `vehicleData`: brand, model, buildYear, modelYear, mileage, fuelType, transmission, bodyType, power, trim, color, options[], keywords[]
- `portalAnalysis`: lowestPrice, medianPrice, highestPrice, listingCount, listings[]
- `jpCarsData`: baseValue, optionValue, totalValue, range, confidence, apr, etr, courantheid, stockStats, salesStats
- `internalComparison`: averageMargin, averageDaysToSell, soldLastYear, soldB2C, soldB2B, averageDaysToSell_B2C, similarVehicles[]
- `feedbackHistory`: feedback_type, notes, vehicle_brand, vehicle_model, vehicle_mileage, vehicle_build_year, ai_recommendation, ai_purchase_price, ai_selling_price, actual_outcome, user_reasoning, user_suggested_price, correction_type, referenced_listing_id, portal_listings[], jpcars_value

**Output (`generate_taxatie_advice`):**
- `recommendation`: 'kopen' | 'niet_kopen' | 'twijfel'
- `recommendedSellingPrice`: number
- `recommendedPurchasePrice`: number
- `expectedDaysToSell`: number
- `targetMargin`: number
- `reasoning`: string
- `jpcarsDeviation`: string
- `riskFactors`: string[]
- `opportunities`: string[]
- `marketFloorPrice`: number
- `marketFloorReasoning`: string
- `feedbackAdjustment`: string (optioneel)

### taxatie-trade-in-advice
**Input (`TradeInRequest`):** zelfde voertuigdata + portalAnalysis + jpCarsData.

**Output (`generate_trade_in_advice`):**
- `marketReferencePrice`: number
- `maxPurchasePrice`: number
- `standardCorrectionPercentage`: number
- `portalUrl`: string
- `warnings[]`: { type, title, description, repairCost, severity }
- `salespersonHints[]`: { title, description, suggestedApproach }
- `customerScreen`: { title, subtitle, referencePrice, offerPrice, savingsText, transparencyItems[], nextSteps[] }
- `reasoning`: string

### analyze-excel-vehicles
**Input:** batch van Excel-rijen (JSON) + kolomnamen.

**Output:** array van geparseerde voertuigen:
- rowIndex, make, model, variant, buildYear, mileage, fuelType, transmission, bodyType, power, askingPrice, color, confidence, originalData, options[]
