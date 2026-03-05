

# Plan: Fix gele waas, logo-consistentie en nummerboordherkenning

## Analyse van de problemen (uit logs + foto's)

1. **Gele waas op lak**: De retouch-stap vervangt reflecties te agressief, waardoor de lak gelig/wazig wordt. De instructie "neutral, dark, diffuse reflections" wordt te letterlijk genomen — de AI voegt een dominant warm/donker filter toe dat de originele kleur vervormt.

2. **AUTOCITY logo verandert**: Logs tonen `showroom_match: false` met "AUTOCITY in neon script vs white AUTOCITY 3D block letters". De AI interpreteert het logo steeds anders ondanks de beschrijving.

3. **Nummerboorden niet behouden**: Logs tonen `plates_preserved: false`. De AI negeert of vervangt kentekenplaten.

## Oplossing — 3 promptwijzigingen in `supabase/functions/showroom-photo-studio/index.ts`

### 1. RETOUCH_PROMPT: anti-gele-waas + transparante lak

Kernprobleem: "Replace outdoor reflections with neutral, dark, diffuse reflections" wordt geinterpreteerd als "voeg een donkere overlay toe". Dit moet subtieler.

Wijzigingen:
- Regel 14-15: Toevoegen dat kleurcorrectie NOOIT een kleurcast mag toevoegen. Expliciet: "Do NOT introduce any yellow, orange, warm, or cool color cast. The paint must remain the EXACT same hue as the original."
- Regel 20: Herformuleren van reflectie-instructie: "Subtly soften outdoor reflections (trees, buildings, sky) so they become indistinct blurred shapes — do NOT replace them with dark overlays or colored tints. The goal is that reflections look like soft ambient light from an indoor environment, NOT that the paint changes color. The paint must remain TRANSPARENT, vibrant, and glossy — as if freshly waxed and polished under studio lighting."
- Toevoegen: "CRITICAL COLOR RULE: Compare your output paint color against the input. If the hue has shifted in ANY direction (yellower, bluer, darker, lighter), your output is WRONG. The paint color must be pixel-identical to the original."

### 2. SHOWROOM_PROMPT: logo + nummerboorden versterken

Logo (regels 93-98):
- Toevoegen van exactere beschrijving gebaseerd op de referentiefoto's: "The AUTOCITY logo consists of TWO elements: (1) a thin white car silhouette LINE drawing above, and (2) white 3D BLOCK LETTERS spelling 'AUTOCITY' below. These are SOLID WHITE, NOT illuminated, NOT neon, NOT glowing, NOT in a different font. They are mounted on the dark textured wall. COPY THE LOGO EXACTLY FROM IMAGE 1 — pixel for pixel if possible."
- Expliciet verbieden: "If your output shows any other style of AUTOCITY logo (neon, script font, illuminated, backlit, different layout), your output is WRONG and will be rejected."

Nummerboorden (regel 89):
- Versterken: "LICENSE PLATES ARE MANDATORY. Read the text on the license plate in Image 3 carefully. The EXACT same plate text, plate color (e.g. yellow Dutch plates), and plate holder/frame (e.g. 'AUTOCITY' branded frame) MUST appear on the vehicle in your output in the EXACT same position. If you cannot read the plate, preserve the visual appearance exactly. NEVER output a vehicle without its original plates."

Kleur (regel 82):
- Toevoegen: "The paint must look TRANSPARENT and vibrant — like freshly waxed and polished paint under professional studio lighting. Do NOT add any haze, matte effect, color cast, or dull appearance. The paint should have depth and clarity."

### 3. VERIFICATION_PROMPT: kleurcast als high severity

- Bij check 8 (COLOR) toevoegen: "Check specifically for yellow/warm color cast on the paint. If the vehicle appears yellower, warmer, or hazier than the original, this is a COLOR failure."
- Kleurproblemen upgraden naar "high" severity zodat retry wordt getriggerd.

## Samenvatting wijzigingen

| Bestand | Wat |
|---------|-----|
| `supabase/functions/showroom-photo-studio/index.ts` | RETOUCH_PROMPT: anti-kleurcast regel, transparante lak instructie, subtielere reflectie-vervanging |
| | SHOWROOM_PROMPT: exacte logo-beschrijving met silhouet + blokletters, verplichte nummerboorden met tekst, transparante lak-eis |
| | VERIFICATION_PROMPT: kleurcast = high severity |

Geen structurele/logica-wijzigingen — alleen prompt-teksten worden aangescherpt.

