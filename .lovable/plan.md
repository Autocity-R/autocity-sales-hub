

# Prompts Exact Overnemen van Master Prompt

## Analyse: Grote Verschillen Gevonden

De huidige prompts wijken **fundamenteel** af van de master prompts. Dit zijn niet kleine tekstverschillen — het beschrijft een **compleet andere showroom**:

| Element | Huidig (FOUT) | Master Prompt (CORRECT) |
|---------|---------------|------------------------|
| Plafond | Donker, witte LED softbox panel | Lichtgrijs #C8C8C8, zwarte track rail met 4-5 spotlights |
| Muren | Donker charcoal #2a2a2a, geen textuur | Medium-donkergrijs #6B6B6B-#787878, micro-cement textuur |
| Muurverlichting | LED strips aan zijmuren | 3 warme spotlight pools op achtermuur |
| Vloer | #1a1a1a-#2a2a2a, spiegel-reflectie | #3A3A3A-#454545, matte sheen reflectie |
| Belichting auto | Three-point studio lighting | Warm overhead light van 3 plafondspots |
| Board tekst regel 2 | "silver car silhouette icon" | "AUTOCITY" in kleiner, lichtgrijs |
| Step volgorde | Steps 1-2-3(remove)-4(studio)-5(board)-6 | Steps 1-2(no-touch)-3(showroom)-4(board)-5(cleanup)-6(quality check) |
| Prompt 2 | Sterk verkort, ontbreekt showroom details | Volledig met complete showroom specs en quality checklist |

## Plan

### Bestand: `supabase/functions/showroom-photo-studio/index.ts`

**Wijziging 1 — `buildFirstPhotoPrompt` (regels 15-125)**
Volledig vervangen door de exacte master prompt tekst. De board/side-view logica blijft via `hasBumper`, maar de board specs worden bijgewerkt (tekst regel 2 = "AUTOCITY" in lichtgrijs ipv silhouette icon). De side-view tekst voor "no board" blijft conceptueel gelijk.

**Wijziging 2 — `buildSequentialPrompt` (regels 127-205)**  
Volledig vervangen door de exacte master prompt tekst, met `${photoNumber}` interpolatie op de juiste plek. Bevat nu de volledige showroom specificaties (niet "match reference" als samenvatting), volledige no-touch zone, en de volledige quality checklist.

Beide functies behouden hun TypeScript signature `(shotAngle: string)` / `(shotAngle: string, photoNumber: number)` en de `hasBumper` conditional logica. Alleen de prompt-tekst wordt 1:1 overgenomen.

Geen wijzigingen aan `callGeminiSingleImage`, `callGeminiWithReference`, `saveToStorage`, of de `serve` handler.

