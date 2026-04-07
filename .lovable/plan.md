

## Fix: Waterdichte Claude JSON Parsing & JP Cars Response Handler

### Probleem
De edge function logs tonen: `SyntaxError: Unexpected non-whitespace character after JSON at position 607`. Claude voegt tekst toe na de JSON array, waardoor `JSON.parse` faalt. Alle Claude-metadata (brandstof, bouwjaar) gaat verloren, en JP Cars queries leveren niks op.

### Aanpassingen in `supabase/functions/daan-b2b-analyse/index.ts`

#### 1. Claude prompt versterken
Voeg expliciete instructie toe aan het einde van de prompt:
```
BELANGRIJK: Geef UITSLUITEND de ruwe JSON array terug. Geen inleiding, geen conclusie, geen markdown. Begin direct met [ en eindig met ].
```

#### 2. Waterdichte JSON parse functie
Vervang de huidige `cleanJson` + `JSON.parse` logica (regels 135-156) door een robuuste `parseClaudeResponse` functie:
- Verwijder markdown formatting
- Zoek eerste `[` of `{` en laatste `]` of `}` — extraheer alleen dat stuk
- `JSON.parse` in try/catch
- Als resultaat geen array is, wrap in array
- Bij falen: log raw output, return lege array

#### 3. JP Cars response handler verbeteren
Vervang de huidige `queryJPCars` response handling (regel 190+):
- Check `response.ok` met status logging (al aanwezig, behouden)
- Na `response.json()`: check `Array.isArray(data)`, dan `data.data`, dan `data.items`
- Log onverwacht formaat als warning

#### 4. Logging toevoegen
Strategische console.logs op vier punten:
- Start: aantal offline voertuigen
- Na Claude: aantal succesvol geëxtraheerde voertuigen
- Per JP Cars query: merk/model + aantal resultaten
- Einde: aantal sterke/mogelijke kansen

### Bestand

| Bestand | Actie |
|---------|-------|
| `supabase/functions/daan-b2b-analyse/index.ts` | Prompt versterken, parse functie vervangen, JP Cars response check, logging |

Na deploy kan de analyse opnieuw gedraaid worden om te verifiëren dat kansen correct worden gevonden.

