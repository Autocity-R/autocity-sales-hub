## Wat ging er fout

Edge function logs tonen:
```
[robin] parse error SyntaxError: Expected ',' or ']' after array element in JSON at position 21538
[robin] FAIL Error: Kon Robin's JSON niet parsen
```

Claude's antwoord werd **afgekapt** halverwege de `schade_overzicht` array. Oorzaak: `max_tokens: 8000` in `intake-robin-analyse/index.ts` (regel 115). De v7 prompt voegt per schade `detectie_blok` + `detectie_bewijs` (vaak meerdere zinnen bewijs-tekst) toe, dus de output is fors gegroeid. Bij een auto met veel schades knalt hij door de 8000-token limiet → onvolledige JSON → parse fail → status blijft hangen, geen PDF.

`parseClaudeResponse` (regel 35-42) doet alleen een directe `JSON.parse` — geen herstel bij truncatie.

## Oplossing (2 wijzigingen in `supabase/functions/intake-robin-analyse/index.ts`)

### 1. Verhoog `max_tokens` 8000 → 16000
Claude Sonnet 4 ondersteunt dit ruim. Geeft ademruimte voor 20+ schades met v7-bewijsteksten.

### 2. Maak `parseClaudeResponse` robuust tegen truncatie
Als de directe parse faalt: probeer de laatste onvolledige array-entry weg te knippen en de JSON te sluiten. Pseudo:
- Detecteer of we in `schade_overzicht: [ ... ]` zitten zonder afsluitende `]`
- Knip tot laatste complete `}` in die array, sluit met `]` + eventuele resterende `}`
- Probeer opnieuw te parsen
- Log een waarschuwing zodat we weten dat er schades zijn afgekapt

Zo overleeft de inspectie ook als Claude ooit weer een limiet raakt — beter een rapport met 18 i.p.v. 20 schades dan helemaal niets.

### 3. Status terugzetten + opnieuw draaien (eenmalig)
De Tiguan-inspectie van net staat nu op `status = 'error'`. Na deploy: ofwel handmatig de inspectie opnieuw starten via een nieuwe upload, ofwel ik kan via een korte SQL-snippet (in een aparte stap) `status` resetten en de edge function opnieuw invoken op hetzelfde `inspection_id`. Voorkeur?

## Buiten scope
- Geen wijzigingen aan v7 prompt zelf (die werkt — alleen de output is langer).
- Geen frame-/UI-wijzigingen.

## Bestanden
- `supabase/functions/intake-robin-analyse/index.ts` — `max_tokens` + `parseClaudeResponse` robust maken
