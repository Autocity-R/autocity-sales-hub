

# Interieur prompt terugzetten naar vorige werkende versie

## Wat

Het huidige "Manus" prompt in `buildInteriorPrompt()` (regels 335-529) vervangen door het eerder werkende prompt dat je hebt geplakt. Dit is grotendeels dezelfde structuur maar met de originele persona ("EDITING an existing car interior photo") en de belangrijke CLOSE-UP sectie in Rule #0 die in de Manus-versie ontbrak.

## Wijziging

**Bestand:** `supabase/functions/showroom-photo-studio/index.ts`

**Regels 335-529** — volledige `buildInteriorPrompt()` functie body vervangen met het door jou aangeleverde prompt. Belangrijkste verschillen met de huidige Manus-versie:

1. **Persona**: terug naar "You are EDITING an existing car interior photo" i.p.v. "photo retouching specialist with printed paper metaphor"
2. **Rule #0**: terug naar "PIXEL-LOCK COMPOSITION" met de cruciale **CLOSE-UP AND DETAIL PHOTOS** sectie (ontbreekt in Manus-versie) — dit voorkomt dat het model uitzoomt bij dashboard-shots
3. **Rule #1**: terug naar "100% UNCHANGED" formulering i.p.v. "FROZEN" terminologie
4. **Rule #2**: terug naar "VIRTUAL SHOWROOM THROUGH WINDOWS ONLY" met de uitgebreide showroom specs inclusief micro-cement/tadelakt texture beschrijving en de WINDOW EDITING PROPORTIONAL RULE
5. **Rule #3**: terug naar de uitgebreidere camera feed instructies met dimensie-specificaties (4 meter floor before rear wall, etc.)
6. **Rule #4-6 + Output**: vrijwel identiek maar met originele formulering

Na de wijziging wordt de edge function automatisch gedeployed.

