

# Plan: Belichting-matching auto ↔ showroom + anti-hallucinatie bescherming

## Probleem

De auto ziet er soms "erin geplakt" uit doordat:
1. De belichting/kleurtemperatuur van de auto niet overeenkomt met de donkere studio-omgeving
2. Reflecties op de lak verraden dat de auto ergens anders stond (buitenlicht)
3. Soms hallucineert de AI en verandert de auto zelf (andere koplampen, grille, vormen)

## Aanpak

Drie promptwijzigingen in `supabase/functions/showroom-photo-studio/index.ts`:

### 1. RETOUCH_PROMPT — Belichting voorbereiden op studio (regel 34-74)

Toevoegen van een nieuw blok `━━━ LIGHTING INTEGRATION (PREPARE FOR STUDIO) ━━━`:
- De lak moet de kleurtemperatuur van een donkere studio overnemen (neutraal/koel, geen warm buitenlicht)
- Reflecties in de lak moeten zachte, diffuse indoor-lichtbronnen tonen — geen scherpe buitenreflecties
- De overgang tussen lichte en donkere lakpanelen moet vloeiend zijn, passend bij studio-verlichting
- Highlight-posities moeten overeenkomen met een groot rechthoekig plafondlicht (LED-strip van de referentie)
- MAAR: alleen de BELICHTING aanpassen, niet de GEOMETRIE of KLEUR van de auto

### 2. SHOWROOM_PROMPT_NORMAL — Lichtintegratie-blok (na regel 143)

Toevoegen van `━━━ LIGHTING INTEGRATION (CRITICAL FOR REALISM) ━━━`:
- De auto moet eruitzien alsof die ECHT in de studio staat — belichting, schaduwen en reflecties moeten 100% consistent zijn met de omgeving uit Image 3
- Highlights op dak/motorkap moeten het rechthoekige LED-plafondlicht van Image 3 weerspiegelen
- Kleurtemperatuur van de lak moet matchen met de studio (neutraal/koel)
- Zijpanelen moeten zachte ambient-reflecties van de donkere muren tonen
- Geen outdoor-artefacten in reflecties (geen bomen, lucht, gebouwen)
- MAAR expliciet: "Adjust ONLY lighting, reflections, and color temperature on the paint. Do NOT change the car's SHAPE, GEOMETRY, FEATURES, or STRUCTURE in any way."

### 3. SHOWROOM_PROMPT_NORMAL + STRICT — Anti-hallucinatie versterking (bij VEHICLE INTEGRITY sectie)

Toevoegen aan beide prompts:
- "You may adjust the lighting, reflections, and color temperature on the vehicle paint to match the studio environment. This means highlights, shadow direction, and ambient color should be consistent with Image 3."
- "You MUST NOT change any STRUCTURAL feature: headlight shape, grille design, bumper form, wheel spoke pattern, body lines, badge positions. If you cannot match the lighting without changing the car's shape, keep the original shape and accept imperfect lighting."
- "PRIORITY ORDER: 1) Vehicle identity preservation, 2) Lighting integration, 3) Background quality. Never sacrifice #1 for #2."

### 4. SHOWROOM_PROMPT_STRICT — Zelfde lichtintegratie-blok

Identiek blok toevoegen als bij NORMAL, aangezien STRICT ook realistische integratie nodig heeft.

## Samenvatting

| Locatie | Wijziging |
|---------|-----------|
| `RETOUCH_PROMPT` (regel ~46) | Nieuw blok: belichting voorbereiden op studio-omgeving |
| `SHOWROOM_PROMPT_NORMAL` (regel ~143) | Nieuw blok: lichtintegratie auto ↔ showroom |
| `SHOWROOM_PROMPT_NORMAL` (regel ~93) | Prioriteitsregel: identiteit > belichting |
| `SHOWROOM_PROMPT_STRICT` (regel ~174) | Zelfde lichtintegratie + prioriteitsregel |

Geen logica-wijzigingen. Alleen prompt-aanpassingen die de AI dwingen om belichting te matchen zonder de auto te veranderen.

