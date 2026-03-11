

# Interieur/Exterieur Switch + Interieur Prompt

## Aanpak

Twee volledig gescheiden paden: de bestaande exterieur code blijft 100% onaangeroerd. Er komt een `mode` parameter die bepaalt welk prompt-pad wordt gebruikt.

## 1. Frontend: `src/pages/FotoStudio.tsx`

- Voeg `studioMode` state toe: `'exterieur' | 'interieur'`
- Voeg een `Tabs` component toe direct onder de header (voor de action buttons): twee tabs "Exterieur" en "Interieur"
- Bij tab-wissel: als er foto's staan, `clearAll()` aanroepen (voorkomt verwarring)
- Stuur `mode: studioMode` mee in de `supabase.functions.invoke` body
- Pas teksten aan per mode:
  - Upload zone: "voertuigfoto's" vs "interieur foto's"
  - Processing tekst: "Showroom foto" vs "Interieur foto"
  - Subtitle: korte uitleg per mode

## 2. Backend: `supabase/functions/showroom-photo-studio/index.ts`

Bestaande functies `buildFirstPhotoPrompt()` en `buildSequentialPrompt()` blijven VOLLEDIG ONAANGEROERD.

Toevoegen:
- `buildInteriorFirstPrompt()` — nieuw, apart prompt
- `buildInteriorSequentialPrompt(photoNumber)` — nieuw, apart prompt
- In de `serve` handler: lees `mode` uit request body (default `'exterieur'`). Als `mode === 'interieur'`, gebruik de interieur prompt functies. Anders de bestaande exterieur functies (ongewijzigd).

### Interieur Prompt Inhoud

Het interieur prompt volgt een vergelijkbare strakke structuur als het exterieur prompt maar met compleet andere regels:

**STEP 1 — IDENTIFY AND LOCK THE INTERIOR**
- Analyseer elk detail: stoelmateriaal/kleur/patroon, dashboard layout, stuurwiel, displays, knoppen, ventilatieroosters, middenconsole, versnellingspook, bekleding textuur
- Noteer alle teksten op knoppen, displays, badges — deze zijn heilig

**STEP 2 — ABSOLUTE NO-TOUCH ZONE (strenger dan exterieur)**
- ALLES binnen het interieur is een no-touch zone
- Zero tolerance: displays mogen niet veranderen (tekst, iconen, kleur), stiksel patronen moeten identiek blijven, leder/stof textuur mag niet veranderen, knopteksten/symbolen ongewijzigd, kleuren van materialen ongewijzigd, houtdecor/aluminium/carbon patronen exact behouden
- Geen details toevoegen die er niet zijn, geen details verwijderen die er wel zijn

**STEP 3 — PROFESSIONELE BELICHTING**
- Warme, gelijkmatige studio-belichting toepassen alsof een professionele automotive fotograaf met de beste camera en softbox verlichting werkt
- Schaduwen in voetruimte en onder dashboard zachter maken maar niet elimineren (natuurlijk)
- Kleuren verrijken zonder oversaturatie — faithful color reproduction
- Scherptediepte en bokeh zoals een professionele automotive fotograaf zou gebruiken

**STEP 4 — RAMEN: SHOWROOM ACHTERGROND**
- Alles zichtbaar door ALLE ramen vervangen door de AutoCity showroom-omgeving:
  - Zijramen: medium-dark grey micro-cement muur (#6B6B6B tot #787878) met warme spotlight pools (consistent met exterieur showroom)
  - Voorruit/achterruit: showroom muur en/of plafond met track rail en spots, afhankelijk van kijkhoek
  - Als de grond zichtbaar is door een raam: dark polished concrete floor (#3A3A3A tot #454545)
- De showroom achtergrond moet er natuurlijk en scherp uitzien, niet wazig
- Reflecties van de showroom op het glas zijn gewenst (subtiel)

**STEP 5 — OPSCHONEN**
- Persoonlijke spullen verwijderen: telefoons, flessen, tassen, papieren, sleutels, kabels
- Vuiligheid/vlekken op stoelen en vloermatten opschonen
- Geen dealer-stickers of aftermarket accessoires
- NIET verwijderen: originele accessoires, badges, OEM matten

**STEP 6 — FINAL QUALITY CHECK**
- Alle display teksten identiek aan input
- Alle knop-symbolen identiek aan input
- Stiksel patronen identiek
- Materiaal texturen identiek
- Kleuren identiek
- Showroom zichtbaar door alle ramen
- Professionele belichting aanwezig
- Geen artefacten, geen hallucinaties

De sequential prompt voegt dezelfde consistency-reference sectie toe als exterieur: match belichting en kleurtemperatuur van de referentiefoto.

## Samenvatting wijzigingen

| Bestand | Wat | Exterieur impact |
|---------|-----|-----------------|
| `FotoStudio.tsx` | Tabs toevoegen, mode state, mode in API call, teksten per mode | Geen — zelfde flow |
| `index.ts` | 2 nieuwe functies + mode check in serve handler | Geen — bestaande functies ongewijzigd |

