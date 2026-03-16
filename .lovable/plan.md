

# Professionele fotografiekwaliteit toevoegen aan exterieur prompts

## Probleem
De huidige exterieur prompts missen instructies over belichting, contrast, kleurdiepte en scherpte. Resultaat: overbelichte, wazige foto's zonder professionele punch (zoals te zien in de geüploade voorbeelden).

## Wijziging

**Bestand:** `supabase/functions/showroom-photo-studio/index.ts`

### 1. Nieuw STEP 5B invoegen in `buildFirstPhotoPrompt()` (na regel 119, voor STEP 6)

Tussen STEP 5 (Cleanup) en STEP 6 (Final Quality Check) een nieuw blok:

```
STEP 5B — PROFESSIONAL AUTOMOTIVE PHOTOGRAPHY GRADE
```

Met expliciete instructies voor:
- **Exposure**: diepe zwarten (#0A0A0A–#151515), geen uitgeblazen highlights (max #F0F0F0), liever iets onder- dan overbelicht
- **Contrast**: sterke micro-contrast op carrosserie, diepe schaduwen onder auto en wielkasten, S-curve tonaal profiel
- **Kleur**: rijke verzadigde lakkleuren, warme kleurtemperatuur (3200K–3500K), geen kleurzweem op carrosserie
- **Scherpte**: messcherpe randen, leesbare badges, geen waas/blur/ruis, lichte achtergrond-softness voor diepte
- **Reflecties**: zichtbare spotlight-reflecties op lak, scherpe speculaire highlights op chroom, geen glans op matte materialen

### 2. Identiek STEP 5B invoegen in `buildSequentialPrompt()` (na regel 240, voor STEP 6)

Exact dezelfde tekst, zodat alle foto's in de set dezelfde kwaliteitsstandaard hebben.

### 3. STEP 6 uitbreiden in beide functies

5 extra checkpunten toevoegen aan de Final Quality Check:
- Geen overbelichte/uitgeblazen gebieden
- Sterke micro-contrast op bodypanelen
- Rijke, verzadigde lakkleuren
- Messcherpe randen en badges
- Zichtbare spotlight-reflecties op carrosserie

### Deployment
Edge function wordt automatisch opnieuw gedeployed na de wijziging.

