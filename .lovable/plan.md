

# Finale Plan: Showroom Pipeline Optimalisatie

Alle 5 ChatGPT-suggesties zijn valide en passen binnen de bestaande architectuur. Hier de concrete wijzigingen:

## Bestand: `supabase/functions/showroom-photo-studio/index.ts`

### 1. RETOUCH_PROMPT (regel 46) — Studio Relight Model

Huidige softening-instructie vervangen door een volledige studio-relight met concreet lichtmodel:

- Outdoor shapes (trees, sky, buildings, horizon) expliciet VERVANGEN door dark studio gradients + LED streaks
- **Paint relight model**: main LED ceiling reflection op dak/motorkap, secondary soft reflections op zijpanelen, donkere gradient naar onderpanelen/wielkasten
- **Windows**: outdoor scenery verwijderen, neutral dark studio glass, ruitreflecties moeten studio plafondlichten tonen
- Toevoeging: *"The vehicle must visually belong to the same photographic exposure as the studio environment"*

### 2. SHOWROOM_PROMPT_NORMAL (na regel 143) — Lighting Integration blok

Nieuw `━━━ LIGHTING INTEGRATION ━━━` blok met:
- LED streak alignment (highlights volgen exact LED geometry van Image 3)
- Brightness/contrast match met studio ambient level
- Kleurtemperatuur match met Image 3
- Window cleanup: neutral dark studio glass, reflecties matchen plafondlichten
- Exposureregel: *"same photographic exposure as the studio environment"*

### 3. SHOWROOM_PROMPT_NORMAL (regel 136-142) — Placement + Shadows

**Vehicle Placement** (regel 136-138):
- Fill `65-80%` → **`60-75%`**
- Margins toevoegen: min 6-10% links/rechts, 8-12% boven daklijn

**Shadows & Reflections** (regel 140-142):
- Tight tire contact shadow **~50-60% opacity** (was 35%)
- Soft ambient shadow under chassis **~20-25% opacity**
- **Shadow direction must match studio lighting from Image 3**
- Edge feather 1-2px, color-matched, geen halo

### 4. SHOWROOM_PROMPT_STRICT (regel 201-207) — Zelfde aanpassingen

- Fill 60-75% + margins
- Contact shadow + ambient shadow + shadow direction
- Lighting Integration blok toevoegen
- Edge feathering

### 5. Pipeline check

De pipeline blijft correct sequentieel: Classify → Retouch → Composite → Verify. Geen wijzigingen nodig aan de flow.

