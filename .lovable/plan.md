

# Analyse: ChatGPT feedback vs ons plan

## Waar ChatGPT gelijk heeft

ChatGPT maakt terechte punten. Ik ben het eens met het meeste:

1. **"Pixel-lock via prompt is een illusie"** — Correct. Generatieve modellen kunnen altijd subtiel afwijken. Prompts helpen maar garanderen niets.
2. **"Reflection replacement is gevaarlijk"** — Correct. Reflecties lopen over koplampen/grille, en "vervangen" leidt tot drift. Alleen verzachten is veiliger.
3. **"Tekst-only verificatie is kwetsbaar"** — Deels correct. Maar met image input (niet alleen tekst) + gestructureerde JSON output wordt het veel sterker.
4. **"Safe fallback nodig"** — 100% eens. Als verificatie faalt na retry, moet je de enhanced foto returnen ipv een verkeerde auto.
5. **"Kentekenhouder niet door AI"** — Eens in principe, maar client-side overlay met perspective warp is complex en niet prioriteit nu.

## Waar ChatGPT te ver gaat / niet praktisch is

1. **Segmentatie/masking** — Niet haalbaar in Edge Functions. Client-side TFJS is te zwaar voor productie. Een aparte microservice is scope creep. Dit is een toekomst-optie.
2. **"Safe vs Aggressive retouch" split** — Klinkt goed maar voegt complexiteit toe zonder bewezen meerwaarde. De retouch-prompt kan één prompt zijn die vuil verwijdert maar geometrie lockt.
3. **2 retries ipv 1** — Elke retry is een extra Gemini Pro call (~30 sec + kosten). 1 retry + fallback is de betere balans.
4. **Kentekenhouder overlay in code** — Vereist plaatdetectie + perspective warp. Niet triviaal, los feature.

## Mijn verbeterde plan: het beste van beide

### Stap 1 — Cosmetic Retouch (Gemini Flash Image)
- **ChatGPT's filosofie adopteren**: "retoucher, niet renderer"
- **Reflection replacement SCHRAPPEN** — alleen verzachten, niet vervangen (ChatGPT heeft gelijk)
- Expliciete identity lock met merk/model/bouwjaar
- Vuil/waas/glans mag, geometrie niet

### Stap 2 — Showroom Compositing (Gemini Pro Image)
- **3 afbeeldingen**: referentie + enhanced + origineel als GROUND TRUTH
- "COMPOSITING, niet GENERATING" filosofie
- Expliciete zijde-telling en mirror-verbod
- Identity lock met merk/model/bouwjaar

### Stap 3 — AI Verificatie (Gemini Flash, image+tekst)
- Stuur origineel + resultaat als **images** (niet alleen tekst)
- Uitgebreide JSON: `{pass, severity, mirrored, changed_parts, issues}`
- **1 retry** als severity != "none" → strengere prompt + issues
- **Safe fallback** als retry ook faalt: return enhanced foto met lichte studio-grading (geen generatieve showroom)

### Frontend (FotoStudio.tsx)
- Kleurveld toevoegen
- 3-staps indicator: "1. Retouch → 2. Showroom → 3. Controle"
- Warning badge bij fallback: "Originele foto gebruikt (identity check gefaald)"
- Fallback resultaat is nog steeds bruikbaar (enhanced foto)

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/showroom-photo-studio/index.ts` | Volledige prompt herschrijving (retouch-filosofie), reflectie-replacement schrappen, stap 3 verificatie + fallback, origineel als 3e image in stap 2 |
| `src/pages/FotoStudio.tsx` | Kleurveld, 3-staps indicator, warning/fallback badge |

## Samenvatting verschil met ChatGPT

| Punt | ChatGPT | Mijn plan |
|------|---------|-----------|
| Segmentatie/mask | Wil intern hosten | Niet haalbaar nu, toekomst |
| Safe/Aggressive split | 2 prompts | 1 prompt, slim genoeg |
| Reflection replacement | Schrappen | **Eens, schrappen** |
| Fallback mode | Ja | **Eens, implementeren** |
| Verificatie | Severity + mirror + parts | **Eens, adopteren** |
| 2 retries | Ja | 1 retry + fallback (kosten) |
| Kentekenhouder overlay | In code | Apart feature, later |

