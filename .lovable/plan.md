

## Fix Kevin Tool Loop + B2C Supplier Data

### Drie wijzigingen in `supabase/functions/kevin-ai-chat/index.ts`

---

### 1. Tool loop fix (regels 326-361)

**Probleem**: `if (!responseMessage)` op regel 332 zorgt ervoor dat de follow-up call wordt overgeslagen als Claude tekst meestuurt naast de tool_use block. Kevin zegt "ik ga het ophalen" maar levert nooit data.

**Fix**: 
- Verwijder de `if (!responseMessage)` guard
- Altijd follow-up call doen als `toolBlocks.length > 0`
- Wrap in een loop (max 3 iteraties) voor het geval Claude meerdere opeenvolgende tools aanroept
- De finale response na het tool_result vervangt altijd de tussentekst

```
// Pseudo-flow:
let currentMessages = claudeMessages
let currentContent = claudeData.content
let finalMessage = ''

for (let i = 0; i < 3; i++) {
  toolBlocks = currentContent.filter(tool_use)
  if (toolBlocks.length === 0) {
    finalMessage = textBlocks
    break
  }
  // Execute ALL tools, build tool_results array
  // Send follow-up to Claude with tool_results
  // Update currentContent with new response
}
```

### 2. Verkochte voertuigen laden (na regel 44)

**Probleem**: De edge function laadt alleen `status IN ('voorraad', 'onderweg')`. Daardoor heeft `get_supplier_analysis` geen data over verkochte auto's — geen marge, geen omloopsnelheid, geen B2C/B2B verdeling.

**Fix**: Extra query toevoegen:
```sql
SELECT id, brand, model, license_number, status, purchase_price, 
       selling_price, created_at, sold_date, supplier_id, details
FROM vehicles 
WHERE status IN ('verkocht_b2c', 'verkocht_b2b', 'afgeleverd')
```

- Supplier IDs uit zowel CRM voorraad als verkochte voertuigen verzamelen voor de contacts query
- Verkochte voertuigen als extra parameter meegeven aan `handleKevinToolCall`

### 3. `get_supplier_analysis` uitbreiden (regels 678-719)

**Probleem**: Berekent alleen voorraad-metrics (hoeveel auto's, gem. rang). Geen marge, geen omloopsnelheid, geen B2C/B2B split.

**Fix**: Tool uitbreiden met verkochte voertuigen data:
- Per leverancier berekenen:
  - B2C verkopen (count + marge + gem. stagedagen)
  - B2B verkopen (count + marge + gem. stagedagen)
  - Totale winst en ROI
  - Gemiddelde omloopsnelheid (sold_date - created_at)
- Sorteer op B2C performance (marge × snelheid)
- Geef top leveranciers met aanbeveling terug

### Technisch overzicht

| Wijziging | Regels | Impact |
|-----------|--------|--------|
| Tool loop fix | 326-361 | Kevin levert altijd een inhoudelijk antwoord na tool call |
| Sold vehicles query | Na 44 | B2C/B2B data beschikbaar voor analyse |
| Supplier analysis | 678-719 | Marge, omloopsnelheid, kanaal-verdeling per leverancier |

