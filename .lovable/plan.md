

# Analyse: Hoekherkenning & Anti-Spiegeling

De huidige pipeline heeft al sterke anti-mirroring en angle preservation regels. Hier is wat er al werkt en wat nog verbeterd kan worden:

## Wat al goed is

1. **Angle Classifier (Step 0)**: Classificeert 10 hoeken correct met duidelijke definities
2. **Anti-Mirror Rule**: Gebruikt kenteken als visuele anker (links moet links blijven)
3. **Angle Preservation in NORMAL prompt**: `{ANGLE} must remain {ANGLE}` met voorbeelden
4. **Verification (Step 3)**: Controleert of hoek behouden is, mirroring = automatic high severity
5. **Retry met STRICT prompt**: Bij angle failure → retry met zero rotation, en als dat ook faalt → fallback naar retouched origineel

## Wat nog ontbreekt / verbeterd moet worden

### 1. RETOUCH_PROMPT mist angle-awareness

De retouch stap (Step 1) krijgt GEEN angle label mee. Als de AI hier al de hoek subtiel verandert, heeft Step 2 een verkeerd startpunt. De retouch prompt zegt wel "Do NOT change the camera angle" maar kent de geclassificeerde hoek niet.

**Fix**: De angle label meegeven aan de retouch prompt zodat de AI weet welke hoek het IS en die moet behouden.

### 2. Verification mist "front became side" detectie als concrete voorbeelden

De verification prompt noemt dit al generiek, maar het kan concreter met de meest voorkomende fouten:
- Front → side (auto wordt gedraaid)
- Left → right (spiegeling)
- Side → three-quarter (perspectief verandert)

**Fix**: Concrete "common failure examples" toevoegen aan verification prompt.

### 3. Showroom prompts missen expliciete "left = left, right = right" regel voor niet-kenteken scenario's

De anti-mirror rule leunt volledig op de kentekenplaat. Maar sommige hoeken (achterkant, bepaalde zijkanten) tonen geen kenteken duidelijk.

**Fix**: Secundaire ankers toevoegen naast kenteken: stuurwiel-zijde (links in NL/EU), tankdop-positie, uitlaatpositie.

## Concrete wijzigingen

### Bestand: `supabase/functions/showroom-photo-studio/index.ts`

**1. Retouch prompt angle-aware maken (regel 465)**

Bij het aanroepen van retouch, de angle label injecteren:
```
RETOUCH_PROMPT + vehicleIdentity + `\n\nDETECTED ANGLE: "${angleLabel}". You MUST preserve this exact viewing angle. Do NOT rotate or reframe the vehicle.`
```

**2. Anti-Mirror Rule uitbreiden in SHOWROOM_PROMPT_NORMAL (regel 124-130)**

Toevoegen na de kenteken-regels:
```
- SECONDARY ANCHORS (when plate is not clearly visible):
  - In EU/NL vehicles, the DRIVER SIDE is LEFT. If the driver door is visible, it must remain on the same side.
  - Exhaust pipe positions must remain on the same side as in Image 2.
  - Fuel cap position must remain on the same side as in Image 2.
- If the input shows a LEFT-side view, the output MUST show the LEFT side. NEVER substitute with the RIGHT side.
- If the input shows RIGHT-front, the output MUST show RIGHT-front. NEVER substitute with LEFT-front.
```

**3. Zelfde uitbreiding in SHOWROOM_PROMPT_STRICT (regel 211-215)**

**4. Verification prompt: concrete failure voorbeelden (regel 276-281)**

Na de bestaande angle check regels, toevoegen:
```
   COMMON FAILURES TO WATCH FOR:
   - Front photo turned into a three-quarter or side view (AI "improved" the composition)
   - Left-side photo became right-side (mirroring)
   - Rear photo became rear-quarter (AI added perspective)
   - Side photo became three-quarter (AI rotated to show more of the front)
   Any of these = HIGH severity failure, angle_preserved = false.
```

## Samenvatting

| Locatie | Wijziging |
|---------|-----------|
| Retouch call (r465) | Angle label meegeven aan retouch prompt |
| `SHOWROOM_PROMPT_NORMAL` r124-130 | Secundaire anti-mirror ankers (stuur, uitlaat, tankdop) |
| `SHOWROOM_PROMPT_STRICT` r211-215 | Zelfde secundaire ankers |
| `VERIFICATION_PROMPT` r276-281 | Concrete failure voorbeelden toevoegen |

Dit zorgt ervoor dat de hoek door de HELE pipeline bewaakt wordt (retouch → composite → verificatie) en niet alleen leunt op het kenteken als anti-mirror anker.

