# Bulk-taxatie: Excel-lijst → JP Cars → AI-advies

Volledige, zelfstandig leesbare documentatie van de bulk-taxatieflow zoals die in het Autocity CRM werkt. Alle prompts, whitelists en mappingtabellen staan hier verbatim, zodat de flow los van dit project na te bouwen is.

**Kernprincipe:** de Excel gaat **nooit** rechtstreeks naar JP Cars. Er zitten drie lagen tussen: een deterministische Excel-lezer, een AI-parser die als "kolom-tolk" werkt, en een mapping-/vangnetlaag die onze velden omzet naar het strakke JP Cars-formaat.

---

## 1. Architectuuroverzicht

```text
[browser] Excel upload (.xlsx / .xls / .csv)
    |
    | XLSX.read -> findHeaderRow() -> sheet_to_json(range: headerRowIndex)
    | rijen met <2 gevulde cellen weg; <3 echte kolommen -> combinedDescription
    v
rawData: Record<string, unknown>[]   +   availableColumns: string[]
    |
    | batches van 150 rijen, 1s delay ertussen
    v
[edge function] analyze-excel-vehicles          (Gemini 2.5 Flash via Lovable AI Gateway)
                analyze-excel-vehicles-claude   (Claude Sonnet via Anthropic Messages API)
    |
    | strikte JSON per voertuig + confidence + options (JP Cars whitelist)
    | JSON-fence stripping, partial-JSON recovery, bouwjaar-regex-fallback, validatie
    v
inputs: BulkTaxatieInput[]   (preview in UI, met confidence-badges)
    |
    | SEQUENTIEEL per voertuig, met withTimeout + withRetry + delays
    v
  jpcars-lookup ......... marktwaarde, APR/ETR, window-listings, portal-URLs
        |                 (HP-retry + partial-data vangnet)
        v
  taxatie-portal-search . concurrentie/marktvloer (window-listings, AI web search als fallback)
        v
  taxatie-internal-search eigen verkoophistorie (marge, statijd, B2B/B2C)
        v
  taxatie-ai-advice ..... kopen/niet kopen, verkoopprijs, max inkoopprijs, marge, risico's
   (of taxatie-ai-advice-claude)
        v
  saveTaxatieValuation -> tabel taxatie_valuations
        v
  Excel-export via src/services/bulkTaxatieExport.ts
```

Betrokken bestanden:

| Bestand | Verantwoordelijkheid |
|---|---|
| `src/hooks/useBulkTaxatie.ts` | Excel lezen, header-detectie, batching, verwerkingslus, state |
| `supabase/functions/analyze-excel-vehicles/index.ts` | AI-parser (Gemini) |
| `supabase/functions/analyze-excel-vehicles-claude/index.ts` | AI-parser (Claude, tool_use) |
| `supabase/functions/jpcars-lookup/index.ts` | JP Cars-mapping, API-call, vangnetten, responsenormalisatie |
| `src/services/taxatieService.ts` | Frontend-aanroepen naar alle edge functions, opslag |
| `src/types/bulkTaxatie.ts` | `BulkTaxatieInput`, `BulkTaxatieResult`, `BulkTaxatieState` |
| `src/services/bulkTaxatieExport.ts` | Excel-export van resultaten |

---

## 2. Stap 1 — Excel inlezen met slimme header-detectie

Leveranciers (Arval, ALD, Athlon, veilingen) zetten logo's, filterregels en lege rijen boven de eigenlijke kop. Daarom lezen we het blad eerst als ruwe array en zoeken we de headerrij op trefwoorden.

```ts
// Find the real header row by looking for common column keywords
const findHeaderRow = (sheetAsArray: unknown[][]): number => {
  const headerKeywords = [
    'position', 'mileage', 'commercial', 'registration', 'brand', 'model',
    'km', 'year', 'bouwjaar', 'kilometerstand', 'merk', 'kenteken',
    'prijs', 'price', 'fuel', 'brandstof', 'transmission', 'owner'
  ];

  for (let i = 0; i < Math.min(20, sheetAsArray.length); i++) {
    const row = sheetAsArray[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    // Convert row to lowercase string for keyword matching
    const rowText = row
      .map(cell => String(cell || '').toLowerCase())
      .join(' ');

    // Count how many keywords match
    const matchCount = headerKeywords.filter(kw => rowText.includes(kw)).length;

    // If we find 2+ keywords, this is likely the header row
    if (matchCount >= 2) {
      console.log(`✅ Header rij gevonden op rij ${i + 1}: "${row.slice(0, 4).join(', ')}..."`);
      return i;
    }
  }

  // Fallback: look for a row with many filled columns (likely the header)
  for (let i = 0; i < Math.min(10, sheetAsArray.length); i++) {
    const row = sheetAsArray[i];
    if (!row || !Array.isArray(row)) continue;

    const filledCells = row.filter(cell => cell && String(cell).trim() !== '').length;
    if (filledCells >= 5) {
      console.log(`📋 Fallback: Header rij op ${i + 1} met ${filledCells} gevulde kolommen`);
      return i;
    }
  }

  return 0; // Default to first row
};
```

Daarna pas het echte inlezen:

```ts
const data = await file.arrayBuffer();
const workbook = XLSX.read(data, { type: 'array' });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

// eerst als array, om de headerrij te vinden
const sheetAsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
const headerRowIndex = findHeaderRow(sheetAsArray);

// nu met de juiste headerrij
const jsonData = XLSX.utils.sheet_to_json(worksheet, {
  range: headerRowIndex,
  defval: '',
  raw: false,          // datums/nummers als string, zodat de AI de brontekst ziet
}) as Record<string, unknown>[];
```

Belangrijke keuzes hierbij:

- `raw: false` — datums komen als leesbare string mee in plaats van als Excel-serienummer. De AI-prompt kan beide aan, maar strings zijn betrouwbaarder.
- `defval: ''` — ontbrekende cellen worden lege strings, zodat kolomsleutels stabiel blijven.
- Alleen het **eerste** tabblad wordt gelezen.

### Kolommen zonder namen

Als bijna alle kolomsleutels `__EMPTY...` zijn (kop niet gevonden, of leverancier levert een blad zonder echte kop), plakken we alle celwaarden per rij samen tot één beschrijvingsveld:

```ts
let columns = Object.keys(jsonData[0]);
const realColumns = columns.filter(c => !c.startsWith('__EMPTY'));

let processedData = jsonData;
let finalColumns = realColumns.length > 0 ? realColumns : columns;

if (realColumns.length < 3) {
  processedData = jsonData.map((row, idx) => ({
    rowIndex: idx,
    combinedDescription: Object.values(row)
      .filter(v => v && String(v).trim() !== '')
      .join(' | '),
  }));
  finalColumns = ['rowIndex', 'combinedDescription'];
}

// Filter rows that have actual data (at least 2 non-empty values)
const validData = processedData.filter(row => {
  const values = Object.values(row).filter(v => v && String(v).trim() !== '');
  return values.length >= 2;
});
```

Dit is de reden dat de flow ook op de meest rommelige lijsten blijft werken: valt de structuur weg, dan valt de flow terug op vrije tekst en laat de AI het uitzoeken.

---

## 3. Stap 2 — De AI-parser als kolom-tolk

De parser bepaalt **geen prijzen**. Zijn enige taak: chaotische leverancierdata omzetten naar één strak voertuigobject dat JP Cars begrijpt.

Aanroep vanuit de hook:

```ts
const batchSize = 150;
const functionName = aiProvider === 'claude' ? 'analyze-excel-vehicles-claude' : 'analyze-excel-vehicles';

for (let i = 0; i < rawData.length; i += batchSize) {
  const batch = rawData.slice(i, i + batchSize);

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: {
      headers: availableColumns,
      rows: batch,
    },
  });

  // ... data.vehicles -> BulkTaxatieInput[]

  if (i + batchSize < rawData.length) {
    await delay(1000);   // 1s tussen batches
  }
}
```

De edge function bouwt eerst een compacte datavoorstelling waarin lege cellen zijn weggelaten (scheelt veel tokens):

```ts
const dataForAI = rows.slice(0, 150).map((row, idx) => {
  const rowData: Record<string, string> = {};
  headers.forEach(h => {
    const val = row[h];
    if (val !== null && val !== undefined && val !== '') {
      rowData[h] = String(val);
    }
  });
  return { rowIndex: idx, ...rowData };
});
```

### 3.1 System prompt (verbatim)

```text
JE IDENTITEIT:
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

KRITIEK: Je analyseert ${dataForAI.length} voertuigen. Retourneer ALLE ${dataForAI.length} voertuigen in je response. Stop NOOIT halverwege.
```

### 3.2 User prompt (verbatim)

```text
KOLOMMEN IN DIT EXCEL BESTAND:
${headers.join(' | ')}

DATA (${dataForAI.length} rijen):
${JSON.stringify(dataForAI, null, 2)}

Analyseer deze data en extraheer de voertuiggegevens. Retourneer ALLEEN een JSON array.
```

### 3.3 Modelaanroep — Gemini-variant

```ts
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
```

Statuscodes die apart worden afgehandeld: `429` (rate limit) en `402` (geen tegoed) worden doorgegeven aan de frontend met een leesbare melding.

### 3.4 Modelaanroep — Claude-variant

Identieke prompt-inhoud, andere API-schil. In plaats van "geef JSON terug" wordt hier **tool_use** gebruikt, wat de output schema-gedwongen maakt:

```ts
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': anthropicKey,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    tools: [parseExcelVehiclesTool],
    tool_choice: { type: 'tool', name: 'parse_excel_vehicles' },
  }),
});
```

Verschillen in de praktijk:

- Claude vult meer velden in (variant, bodyType, power) maar geeft iets lagere confidence-scores.
- `max_tokens` staat op 8192, dus batchgroottes boven ~80 rijen kunnen bij Claude tegen de limiet lopen. Bij Gemini is 150 met 65536 tokens ruim.
- Met `tool_choice` is markdown-fence stripping niet nodig; het antwoord is al een object.

---

## 4. Stap 3 — De robuustheidslaag na de AI

Dit is het deel dat het verschil maakt tussen "werkt bij een demo-Excel" en "werkt bij elke leverancier".

### 4.1 JSON uit tekst halen

```ts
let jsonStr = content;
const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
if (jsonMatch) {
  jsonStr = jsonMatch[1];
}

jsonStr = jsonStr.trim();
if (!jsonStr.startsWith('[')) {
  const arrayStart = jsonStr.indexOf('[');
  if (arrayStart !== -1) {
    jsonStr = jsonStr.substring(arrayStart);
  }
}
```

### 4.2 Partial-JSON recovery (twee methodes)

Als het model halverwege is afgekapt (`finish_reason === 'length'`), gooien we de batch niet weg maar knippen we tot het laatste complete object:

```ts
try {
  vehicles = JSON.parse(jsonStr);
} catch (parseError) {
  // methode 1: knip tot de laatste "},"
  const lastCompleteObject = jsonStr.lastIndexOf('},');
  if (lastCompleteObject > 0) {
    const recoveredJson = jsonStr.substring(0, lastCompleteObject + 1) + ']';
    try {
      vehicles = JSON.parse(recoveredJson);
    } catch {
      // methode 2: knip tot de laatste "}"
      const lastObject = jsonStr.lastIndexOf('}');
      if (lastObject > 0) {
        const recovered2 = jsonStr.substring(0, lastObject + 1) + ']';
        vehicles = JSON.parse(recovered2);
      } else {
        throw new Error('Kon AI response niet parsen');
      }
    }
  } else {
    throw new Error('Kon AI response niet parsen');
  }
}
```

### 4.3 Bouwjaar-fallback in code

De AI mist soms het jaar bij exotische datumkolommen. De code repareert dat zelf op basis van `originalData`:

```ts
const currentYear = new Date().getFullYear();
const extractYearFromString = (str: string): number | null => {
  if (!str) return null;
  // Match 4-digit year between 1990-2030
  const yearMatch = str.match(/\b(19[9][0-9]|20[0-2][0-9]|2030)\b/);
  if (yearMatch) return parseInt(yearMatch[1], 10);
  // Match dd-mm-yyyy or yyyy-mm-dd patterns
  const dateMatch = str.match(/(\d{2})[.\-\/](\d{2})[.\-\/](\d{4})/);
  if (dateMatch) return parseInt(dateMatch[3], 10);
  const dateMatch2 = str.match(/(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})/);
  if (dateMatch2) return parseInt(dateMatch2[1], 10);
  return null;
};

vehicles.forEach(v => {
  if (!v.buildYear || v.buildYear <= 1990 || v.buildYear > currentYear + 1) {
    const extractedYear = extractYearFromString(v.originalData || '');
    if (extractedYear && extractedYear > 1990 && extractedYear <= currentYear + 1) {
      v.buildYear = extractedYear;
    }
  }
});
```

### 4.4 Validatie en verklaarbare uitval

```ts
const validVehicles = vehicles.filter(v =>
  v.make &&
  v.model &&
  v.buildYear && v.buildYear > 1990 && v.buildYear <= currentYear + 1 &&
  (v.mileage !== undefined && v.mileage >= 0)   // 0 km is geldig bij nieuwe auto's
);
```

Elke afgekeurde rij wordt gelogd met de reden (`GEEN MAKE`, `GEEN MODEL`, `GEEN JAAR`, `JAAR TE OUD: x`, `JAAR TOEKOMST: x`, `GEEN KM`, `KM NEGATIEF: x`) plus de eerste 80 tekens van `originalData`. Dat is bij een nieuwe leverancierslijst de snelste manier om te zien welke kolom niet doorkomt.

De response bevat expliciet de tellingen:

```json
{
  "vehicles": [ ... ],
  "totalParsed": 150,
  "totalValid": 143,
  "skipped": 7
}
```

### 4.5 Van AI-output naar `BulkTaxatieInput`

```ts
const inputs = vehicles.map((v): BulkTaxatieInput => ({
  rowIndex: i + v.rowIndex + 1,
  brand: v.make,
  model: v.model,
  buildYear: v.buildYear,
  mileage: v.mileage,
  fuelType: v.fuelType,
  transmission: v.transmission,
  askingPrice: v.askingPrice || undefined,
  color: v.color || undefined,
  power: v.power || undefined,
  variant: v.variant || undefined,
  bodyType: v.bodyType || undefined,
  originalDescription: v.originalData,
  parseConfidence: v.confidence,
  options: v.options || [],
}));
```

In de UI worden de rijen gegroepeerd op confidence: `>= 0.7` hoog, `0.5–0.7` gemiddeld, `< 0.5` laag. Zo kan de gebruiker vóór de taxatie zien welke rijen twijfelachtig zijn.

---

## 5. Stap 4 — De vertaalslag naar JP Cars

De frontend bouwt eerst een neutraal `TaxatieVehicleData`-object:

```ts
const vehicleData: TaxatieVehicleData = {
  brand: input.brand,
  model: input.model,
  buildYear: input.buildYear,
  mileage: input.mileage,
  fuelType: input.fuelType || 'Benzine',
  transmission: (input.transmission?.toLowerCase().includes('auto') ? 'Automaat' :
                input.transmission?.toLowerCase().includes('hand') ? 'Handgeschakeld' : 'Onbekend'),
  bodyType: input.bodyType || '',
  power: input.power || 0,
  trim: input.variant || '',
  color: input.color || '',
  options: input.options || [],   // whitelist-opties van de AI
  keywords: [],
};
```

`fetchJPCarsData()` zet dit om naar de request naar de edge function:

```ts
const requestBody: Record<string, unknown> = { mileage: vehicleData?.mileage || 0 };
if (licensePlate) requestBody.licensePlate = licensePlate;   // bij bulk leeg
requestBody.make  = vehicleData.brand;
requestBody.model = vehicleData.model;
requestBody.fuel  = vehicleData.fuelType;
requestBody.gear  = vehicleData.transmission;
requestBody.build = vehicleData.buildYear;
requestBody.hp    = vehicleData.power;
requestBody.body  = vehicleData.bodyType;
if (vehicleData.modelYear) requestBody.modelYear = vehicleData.modelYear;
if (vehicleData.powerKw)   requestBody.kw = vehicleData.powerKw;
if (vehicleData.color)     requestBody.color = vehicleData.color;
if (vehicleData.options?.length) requestBody.options = vehicleData.options;
```

### 5.1 Requestbody voor JP Cars

```ts
const jpCarsRequestBody: Record<string, unknown> = { mileage: requestBody.mileage || 0 };

if (requestBody.licensePlate) jpCarsRequestBody.license_plate = requestBody.licensePlate.replace(/[-\s]/g, '').toUpperCase();
if (requestBody.make)  jpCarsRequestBody.make  = requestBody.make.toUpperCase();
if (requestBody.model) jpCarsRequestBody.model = requestBody.model.toUpperCase();
if (requestBody.body)  jpCarsRequestBody.body  = mapBodyType(requestBody.body);
if (requestBody.fuel)  jpCarsRequestBody.fuel  = mapFuelType(requestBody.fuel);
if (requestBody.gear)  jpCarsRequestBody.gear  = mapGearType(requestBody.gear);
if (requestBody.build) jpCarsRequestBody.build = requestBody.build;
if (requestBody.modelYear) jpCarsRequestBody.model_year = requestBody.modelYear;

// HP: JP Cars vereist dit veld, maar hp: 0 geeft ERROR_INVALID_CAR
if (requestBody.hp && requestBody.hp > 0) {
  jpCarsRequestBody.hp = requestBody.hp;
} else if (requestBody.kw && requestBody.kw > 0) {
  jpCarsRequestBody.hp = Math.round(requestBody.kw * 1.36);
} else {
  // geen HP/KW: veld helemaal weglaten, JP Cars matcht op de rest
}
if (requestBody.kw && requestBody.kw > 0) jpCarsRequestBody.kw = requestBody.kw;
if (requestBody.color) jpCarsRequestBody.color = mapColor(requestBody.color);
if (requestBody.body)  jpCarsRequestBody.four_doors = determineFourDoors(requestBody.body);

if (requestBody.options?.length) {
  const mappedOptions = mapOptionsToJPCars(requestBody.options);   // één string, spatie-gescheiden
  if (mappedOptions) jpCarsRequestBody.options = mappedOptions;
}
```

Endpoint en query params:

```ts
const url = new URL('https://api.nl.jp.cars/api/valuate/extended');
url.searchParams.append('enable_portal_urls', 'true');
url.searchParams.append('enable_top_dealers', 'true');
url.searchParams.append('percents', '10,25,50,75,90');

fetch(url.toString(), {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${JPCARS_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(jpCarsRequestBody),
});
```

### 5.2 Mappingtabellen (verbatim)

**Brandstof**

```ts
function mapFuelType(fuel: string): string {
  const fuelMap: Record<string, string> = {
    'Benzine': 'PETROL',
    'Diesel': 'DIESEL',
    'Elektrisch': 'ELECTRIC',
    'Hybride': 'HYBRID',
    'Plug-in Hybride': 'PLUGIN_HYBRID',
    'Plug-in hybride': 'PLUGIN_HYBRID',
    'LPG': 'LPG',
    'CNG': 'CNG',
    'Waterstof': 'HYDROGEN',
  };
  return fuelMap[fuel] || fuel.toUpperCase();
}
```

**Transmissie**

```ts
function mapGearType(gear: string): string {
  const gearMap: Record<string, string> = {
    'Automaat': 'AUTOMATIC_GEAR',
    'Automatisch': 'AUTOMATIC_GEAR',
    'Handgeschakeld': 'MANUAL_GEAR',
    'Handmatig': 'MANUAL_GEAR',
    'CVT': 'AUTOMATIC_GEAR',
  };
  return gearMap[gear] || gear.toUpperCase();
}
```

**Carrosserie**

```ts
function mapBodyType(body: string): string {
  const bodyMap: Record<string, string> = {
    'Hatchback': 'SmallCar',
    'Sedan': 'Sedan',
    'Stationwagen': 'StationWagon',
    'Station': 'StationWagon',
    'SUV': 'SUV',
    'Terreinwagen': 'SUV',
    'Coupé': 'Coupe',
    'Coupe': 'Coupe',
    'Cabrio': 'Cabrio',
    'Cabriolet': 'Cabrio',
    'MPV': 'MPV',
    'MVP': 'MPV',
    'Pick-up': 'Pickup',
    'Pickup': 'Pickup',
    'Bus': 'Bus',
    'Bestelwagen': 'Van',
    'Van': 'Van',
  };
  return bodyMap[body] || body;
}
```

Let op: `Hatchback` → `SmallCar`. Dat is een JP Cars-eigenaardigheid en een veelgemaakte fout bij nabouwen.

**Kleur**

```ts
function mapColor(color: string): string {
  const colorMap: Record<string, string> = {
    'zwart': 'BLACK',
    'wit': 'WHITE',
    'grijs': 'GREY',
    'zilver': 'SILVER',
    'blauw': 'BLUE',
    'rood': 'RED',
    'groen': 'GREEN',
    'bruin': 'BROWN',
    'beige': 'BEIGE',
    'geel': 'YELLOW',
    'oranje': 'ORANGE',
    'paars': 'PURPLE',
    'goud': 'GOLD',
  };
  return colorMap[color.toLowerCase()] || color.toUpperCase();
}
```

**Aantal deuren**

```ts
function determineFourDoors(body: string): boolean {
  const fourDoorTypes = ['Sedan', 'Stationwagen', 'Station', 'SUV', 'MPV', 'Hatchback'];
  const twoDoorTypes = ['Coupé', 'Coupe', 'Cabrio', 'Cabriolet'];

  if (twoDoorTypes.some(t => body.toLowerCase().includes(t.toLowerCase()))) return false;
  if (fourDoorTypes.some(t => body.toLowerCase().includes(t.toLowerCase()))) return true;
  return true; // Default to 4 doors
}
```

**Opties → één spatie-gescheiden string**

```ts
function mapOptionsToJPCars(options: string[]): string {
  // Nederlandse waarde-bepalende opties + Engelse passthrough
  const valueOptionMap: Record<string, string> = {
    'panoramadak': 'panorama roof',
    'luchtvering': 'air suspension',
    'premium_audio': 'premium audio',
    '7_zitter': '7 seater',
    'trekhaak': 'tow bar',
    'long_range': 'long range',
    'panorama roof': 'panorama roof',
    'air suspension': 'air suspension',
    'premium audio': 'premium audio',
    '7 seater': '7 seater',
    'tow bar': 'tow bar',
    'long range': 'long range',
  };

  // Legacy mapping voor backwards compatibility
  const legacyOptionMap: Record<string, string> = {
    // Dak opties
    'panorama dak': 'panorama roof',
    'schuifdak': 'sunroof',
    'schuif-/kanteldak': 'sunroof',

    // Interieur
    'leder': 'leather',
    'lederen bekleding': 'leather',
    'leer': 'leather',
    'alcantara': 'alcantara',
    'stoelverwarming': 'heated seats',
    'verwarmde stoelen': 'heated seats',
    'stoelkoeling': 'ventilated seats',
    'geventileerde stoelen': 'ventilated seats',
    'elektrische stoelen': 'electric seats',
    'sportstoelen': 'sport seats',
    'massagestoelen': 'massage seats',

    // Navigatie & Audio
    'navigatie': 'navigation',
    'navigatiesysteem': 'navigation',
    'navi': 'navigation',
    'harman kardon': 'harman kardon',
    'harman': 'harman kardon',
    'bose': 'bose',
    'bang olufsen': 'bang olufsen',
    'b&o': 'bang olufsen',
    'burmester': 'burmester',

    // Rijhulpsystemen
    'acc': 'adaptive cruise control',
    'adaptive cruise control': 'adaptive cruise control',
    'adaptieve cruisecontrol': 'adaptive cruise control',
    'lane assist': 'lane assist',
    'rijstrookassistent': 'lane assist',
    'dodehoekassistent': 'blind spot',
    'dode hoek': 'blind spot',
    'head-up display': 'head up display',
    'head up display': 'head up display',
    'headup': 'head up display',
    'hud': 'head up display',

    // Camera's
    'camera 360': '360 camera',
    '360 camera': '360 camera',
    '360 graden camera': '360 camera',
    'achteruitrijcamera': 'rear camera',
    'camera achter': 'rear camera',
    'parkeer camera': 'rear camera',

    // Verlichting
    'led': 'LED',
    'led koplampen': 'LED',
    'matrix led': 'matrix LED',
    'matrix': 'matrix LED',
    'laser': 'laser',
    'laserlicht': 'laser',
    'adaptieve verlichting': 'adaptive lights',

    // Trekhaak
    'trekhaak': 'tow bar',
    'afneembare trekhaak': 'tow bar',
    'elektrische trekhaak': 'tow bar',

    // Keyless
    'keyless': 'keyless',
    'keyless entry': 'keyless',
    'keyless go': 'keyless',
    'comfort access': 'keyless',

    // Pakketten / Uitvoeringen
    'r-line': 'R-Line',
    's-line': 'S-Line',
    'amg': 'AMG',
    'amg line': 'AMG',
    'm pakket': 'M sport',
    'm sport': 'M sport',
    'gt line': 'GT Line',
    'rs line': 'RS Line',

    // Wielopties
    'lichtmetalen velgen': 'alloy wheels',
    'lm velgen': 'alloy wheels',
    '19 inch': '19 inch',
    '20 inch': '20 inch',
    '21 inch': '21 inch',

    // Overig
    'elektrische achterklep': 'electric tailgate',
    'privacy glass': 'privacy glass',
    'getint glas': 'tinted glass',
    'stuurverwarming': 'heated steering wheel',
    'verwarmde stuur': 'heated steering wheel',
    'draadloos opladen': 'wireless charging',
    'apple carplay': 'apple carplay',
    'android auto': 'android auto',
    'digitaal instrumentenpaneel': 'digital cockpit',
    'virtual cockpit': 'digital cockpit',
  };

  // Combineer beide maps met prioriteit voor valueOptionMap
  const optionMap = { ...legacyOptionMap, ...valueOptionMap };

  const mappedOptions: string[] = [];
  for (const option of options) {
    const lowerOption = option.toLowerCase().trim();

    if (optionMap[lowerOption]) {          // exacte match
      mappedOptions.push(optionMap[lowerOption]);
      continue;
    }
    for (const [dutch, english] of Object.entries(optionMap)) {   // partial match
      if (lowerOption.includes(dutch) || dutch.includes(lowerOption)) {
        if (!mappedOptions.includes(english)) mappedOptions.push(english);
        break;
      }
    }
  }

  return mappedOptions.join(' ');   // JP Cars verwacht één keyword-string
}
```

---

## 6. Stap 5 — De vangnetten rond de JP Cars-call

### 6.1 Altijd de body lezen, ook bij een foutstatus

```ts
const responseText = await response.text();
data = JSON.parse(responseText);

const hasUsableData = !!(
  data.window_url ||
  data.value ||
  (data.apr !== undefined && data.apr !== 0) ||
  (data.etr !== undefined && data.etr !== 0)
);
```

`401` → authenticatiefout (token), `422` → ongeldige voertuiggegevens. Onparseerbare body → harde fout.

### 6.2 HP-retry bij `ERROR_INVALID_CAR`

Het meest voorkomende probleem bij externe lijsten: het opgegeven vermogen bestaat niet in de JP Cars-catalogus voor dat model/jaar. Dan halen we `hp` en `kw` eruit en doen dezelfde call opnieuw:

```ts
const isHpError = data.error === 'ERROR_INVALID_CAR' &&
  (data.error_message?.includes('hp not found') ||
   data.error_message?.includes('hp') ||
   data.error_message?.includes('power'));

if (isHpError && jpCarsRequestBody.hp) {
  originalHp = jpCarsRequestBody.hp as number;
  delete jpCarsRequestBody.hp;
  delete jpCarsRequestBody.kw;

  const retryResponse = await fetch(url.toString(), { /* zelfde headers/body */ });
  if (retryResponse.ok) {
    const retryData = await retryResponse.json();
    if (!retryData.error) {
      Object.assign(data, retryData);
      usedFallback = true;
      fallbackWarning = `De opgegeven ${originalHp} pk staat niet in de JP Cars catalogus. ` +
                        `Taxatie uitgevoerd zonder HP-filter (alle vermogensvarianten).`;
    }
  }
}
```

De waarschuwing gaat mee in het resultaat (`fallbackWarning` + `originalRequest.hp`), zodat de taxateur ziet dat de waardering breder is genomen.

### 6.3 Partial data accepteren

Is de retry ook mislukt maar is er wel bruikbare data, dan gaan we door in plaats van de auto te laten falen:

```ts
if (hasUsableData) {
  hasPartialData = true;
  fallbackWarning = `JP Cars melding: ${data.error_message || data.error}. Beschikbare data wordt gebruikt.`;
}
if (!usedFallback && !hasPartialData) {
  // pas nu een echte fout, met hints:
  // { message, suggestion, requestedHp, vehicleRecognized: { make, model, fuel } }
}
```

### 6.4 Responsevelden — de valkuilen

| Ons veld | JP Cars-bron | Opmerking |
|---|---|---|
| `baseValue` | `topdown_value` of `value` | |
| `optionValue` | `option_value` | |
| `totalValue` | `value` | |
| `range.min` / `range.max` | `percents[]` (percent 10 en 90) | fallback `value * 0.85` / `value * 1.15` |
| `apr` | `apr` | schaal 1-5, databetrouwbaarheid; default 3 |
| `etr` | **`stat_turnover_ext`** | schaal 1-5, doorloopsnelheid — **niet** `data.etr` |
| `itr` | `stat_turnover_int` | interne doorloopsnelheid |
| `stockStats.count` | `window_size` | |
| `stockStats.avgDays` | `stock_days_average` of `stat_stock_days` | echte dagen |
| `salesStats.count` | `sold_count` of `stat_sold_count` | |
| `salesStats.avgDays` | `sold_days_average` of `stat_sold_days` | |
| `marketDiscount` | `market_discount` | |
| `priceSensitivity` | `price_sensitivity` | |
| `aprBreakdown` | `apr_breakdown.{mileage_impact, options_impact, age_impact}` | waarom de APR-score zo is |
| `portalUrls` | `url_gaspedaal`, `url_autoscout24`, `url_marktplaats`, `window_url` | |
| `topDealers` | `top_dealers[]` | naam, stock_count, sold_count, turnover |
| `valueBreakdown` | `topdown_value_breakdown` | |
| `window` | `window[]` | alle vergelijkbare listings — basis voor de marktvloer |
| `valueExex` | `value_exex` | waarde ex-btw |
| `valueAtMaturity` | `value_at_maturity` | |
| `rankTarget` / `rankCurrent` / `targetPerc` | idem | positie t.o.v. de markt |

`ETR` uit het verkeerde veld halen is de klassieke fout: `data.etr` is vaak 0 of afwezig terwijl `stat_turnover_ext` de echte score bevat.

---

## 7. Stap 6 — De verwerkingslus

Per voertuig strikt sequentieel, met timeout, retries en pauzes. Bulk parallel draaien breekt op quota en JP Cars-limieten.

```ts
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withTimeout = <T>(promise: Promise<T>, ms: number, operation: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout na ${ms / 1000}s bij ${operation}`)), ms)),
  ]);

const withRetry = async <T>(fn: () => Promise<T>, retries: number, delayMs: number, operation: string): Promise<T> => {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { return await fn(); }
    catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) await delay(delayMs);
    }
  }
  throw lastError;
};
```

De keten per auto:

| Stap | Timeout | Retries | Delay erna |
|---|---|---|---|
| `jpcars-lookup` | 30s | 2 (2s tussen) | 300ms |
| `taxatie-portal-search` | 45s | 2 (2s tussen) | 200ms |
| `taxatie-internal-search` | 15s | 1 (1s tussen) | 200ms |
| `taxatie-ai-advice` | 60s | 2 (3s tussen) | — |
| tussen twee voertuigen | — | — | 1000ms |

Verder:

- **Feedbackcontext wordt één keer per batch opgehaald** (`fetchRecentFeedback(30)`, 10s timeout) en gecached in een ref. Niet per auto — dat was eerder de grootste vertrager.
- Elke auto is volledig geïsoleerd: een fout zet alleen die rij op `status: 'error'` met de foutmelding, de lus loopt door.
- `saveTaxatieValuation()` slaat alles op in `taxatie_valuations` met `aiModelVersion` (`gpt-4o` of `claude-sonnet-4-6`), zodat je later per model kunt vergelijken.
- Statusmodel per rij: `pending` → `processing` → `completed` | `error`.

---

## 8. Bijlage A — Waarom leverancierslijsten (Arval e.d.) stukliepen, en wat het opvangt

| Probleem in de bronlijst | Waar het misgaat zonder vangnet | Wat het in deze flow opvangt |
|---|---|---|
| Logo/filterregels boven de kop, kop op rij 7 | `sheet_to_json` pakt rij 1 als kop → alle kolommen heten `__EMPTY_3` | `findHeaderRow()` met trefwoordenscan over 20 rijen |
| Geen kop, alleen data | Geen kolomnamen om op te mappen | `combinedDescription` (alle cellen met ` \| ` aan elkaar) + AI leest vrije tekst |
| `Registration date` in plaats van bouwjaar, in vijf verschillende datumnotaties | Bouwjaar wordt `44621` of `null` → JP Cars weigert | prompt-regels bouwjaar-extractie + `extractYearFromString()` fallback |
| Vermogen als kW, of alleen een motorcode (`2.0 TDI 150`) | `hp: 0` → `ERROR_INVALID_CAR` | kW×1,36 in de prompt, `hp` weglaten bij twijfel, HP-retry in de edge function |
| Vermogen bestaat niet in JP Cars-catalogus voor dat model/jaar | Hele auto faalt | HP-retry zonder `hp`/`kw` + `fallbackWarning` |
| Opties in één lange vrije-tekstkolom, in Duits/Frans/Pools | Ruis naar JP Cars, of opties die de API niet kent | whitelist in de prompt + meertalige vertaalregels + `mapOptionsToJPCars` als tweede filter |
| Model staat alleen als uitvoering (`Sportback 40 TFSI`) | Merk ontbreekt → rij valt uit | prompt: "HERLEID HET MERK uit je automotive kennis" |
| Nieuwe auto met 0 km | `mileage >= 1`-validatie gooit hem weg | validatie staat expliciet op `mileage >= 0` |
| 400+ rijen in één bestand | Eén AI-call kapt af, hele batch verloren | batches van 150 + partial-JSON recovery + `finish_reason`-check |
| Kolomnamen in het Engels/Duits/Frans | Vaste kolommapping werkt niet | AI ontvangt de kolomnamen in de user prompt en mapt zelf |
| JP Cars geeft error maar wél window/value | Auto faalt onnodig | `hasUsableData` → partial data gebruiken |

Praktische debugroute bij een nieuwe leverancier:

1. Kijk in de logs van `analyze-excel-vehicles` naar `📤 Verzonden / 📥 Ontvangen / ✅ Geldig / ❌ Gefaald`.
2. Bekijk de eerste 5 RAW voertuigen — daar zie je direct of `make`/`model`/`buildYear` goed uit de kolommen komen.
3. Bekijk de gefaalde rijen met hun redenlabels en `originalData`.
4. Is de reden `GEEN JAAR`, dan zit het probleem in de datumkolom → prompt-voorbeeld toevoegen of regex-fallback uitbreiden.
5. Is de reden een JP Cars `ERROR_INVALID_CAR`, kijk dan naar `vehicleRecognized` in de foutrespons: daar staat wat JP Cars wél herkende.

---

## 9. Bijlage B — Overzetkaart voor een ander project

Minimale set om deze flow los na te bouwen:

1. **Excel-lezer (client of server)** — `xlsx`, `findHeaderRow()`, `combinedDescription`-fallback, rijvalidatie. Puur deterministisch, geen AI.
2. **Parser-agent (server)** — één endpoint dat `{ headers, rows }` aanneemt en `{ vehicles, totalParsed, totalValid, skipped }` teruggeeft. System prompt uit §3.1, user prompt uit §3.2. Batchgrootte afstemmen op de token-limiet van je model.
3. **Robuustheidslaag (server, in dezelfde functie)** — fence stripping, partial-JSON recovery, bouwjaar-regex, validatie met verklaarbare uitval.
4. **Waarderingsadapter (server)** — de mappingtabellen uit §5.2, de requestbody uit §5.1, plus de HP-retry en partial-data logica uit §6. Dit is de laag die je per waarderingsprovider vervangt.
5. **Verwerkingslus (client of queue)** — sequentieel, `withTimeout`/`withRetry`, delays, per-rij foutisolatie, één keer context ophalen per batch.
6. **Opslag + export** — één rij per taxatie met het gebruikte model erin, zodat je modellen kunt vergelijken.

Benodigde secrets: `JPCARS_API_TOKEN`, plus `LOVABLE_API_KEY` (Gemini via gateway) of `ANTHROPIC_API_KEY` (Claude).

De belangrijkste ontwerpregel om vast te houden: **de AI mag alleen interpreteren, nooit waarderen.** Zodra de AI ook prijzen mag verzinnen, verlies je zowel reproduceerbaarheid als de mogelijkheid om fouten te herleiden naar één laag.
