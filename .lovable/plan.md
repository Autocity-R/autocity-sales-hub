

# Plan: Hybride Studio met Vaste Referentie-Achtergrond

## Analyse

Het kernprobleem is dat de AI elke keer een andere showroom "verzint". De oplossing van ChatGPT (volledige code-compositing) is technisch ideaal, maar heeft een groot praktisch probleem: Gemini kan niet betrouwbaar transparante PNG's met achtergrondverwijdering genereren. Achtergrondverwijdering vereist gespecialiseerde segmentatie-modellen die we hier niet hebben.

**Haalbare oplossing**: Gebruik jouw ChatGPT-referentiefoto als **visuele template** die we meesturen naar de AI. In plaats van de showroom te beschrijven in tekst, laten we het model de auto plaatsen in **exact dezelfde showroom als op de referentiefoto**. Dit geeft veel consistentere resultaten omdat het model een concreet visueel voorbeeld heeft.

## Wat er verandert

### 1. Referentie-afbeelding opslaan als vast asset
- Kopieer de geuploadde ChatGPT showroom-foto naar `public/studio/autocity_studio_reference.png`
- Dit wordt de vaste visuele referentie die bij elke verwerking wordt meegestuurd

### 2. Edge Function: `showroom-photo-studio/index.ts` — herschrijven
- **Twee afbeeldingen** meesturen naar Gemini: de referentie-showroom + de te verwerken autofoto
- Nieuwe prompt: "Plaats de auto uit foto 2 in exact dezelfde showroom als foto 1"
- Expliciete instructies: zelfde kleuren (warm goud LED strip, donkere wanden), zelfde logo-stijl, zelfde vloerreflecties
- **Geen perspectiefcorrectie** — hoek van de originele foto behouden
- **Geen voertuigwijzigingen** — kleur, velgen, badges, kentekenhouders intact
- De referentie-afbeelding wordt geladen vanuit een vaste URL of base64 in de function

### 3. Frontend: `FotoStudio.tsx` — referentie-afbeelding meesturen
- Bij elke verwerking wordt de vaste studio-referentie mee geüpload naar de edge function
- Geen andere frontend-wijzigingen nodig — de multi-upload en batch processing blijven hetzelfde

## Waarom dit beter werkt

- Het model krijgt een **concreet visueel voorbeeld** in plaats van alleen tekst
- Logo, kleuren, lichtstrip en vloerreflecties worden consistent gekopieerd van de referentie
- De warme goud/crème tinten uit jouw voorbeeld worden correct overgenomen
- Veel betere consistentie dan alleen een tekst-prompt

## Bestanden

| Bestand | Actie |
|---------|-------|
| `public/studio/autocity_studio_reference.png` | Nieuw — vaste referentiefoto (jouw ChatGPT voorbeeld) |
| `supabase/functions/showroom-photo-studio/index.ts` | Wijzigen — dual-image prompt met referentie |
| `src/pages/FotoStudio.tsx` | Wijzigen — referentie-afbeelding meeladen |

