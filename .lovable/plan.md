

# Pipeline v3 Hybrid+ — Kritische Analyse & Implementatieplan

## Analyse van ChatGPT's voorstel

ChatGPT's architectuuranalyse is grotendeels correct, maar bevat één onhaalbaar element en enkele punten die aanscherping nodig hebben.

### Wat NIET kan: Programmatic Composite (Step 3 in ChatGPT's plan)

Supabase Edge Functions draaien op Deno. Er is **geen Canvas API, geen Sharp, geen image processing library** beschikbaar. Chroma key extractie, gaussian blur shadows, layer compositing — dit vereist pixel-level beeldverwerking die onmogelijk is in deze omgeving. ChatGPT's "deterministic compositing in code" is technisch niet uitvoerbaar zonder een externe service.

### Wat WEL klopt en we moeten overnemen

1. **Step 1 doet te veel** — RETOUCH vervangt nu reflecties, simuleert studio lighting, EN doet cosmetische schoonmaak. Dit conflicteert met Step 2 die WEER relighting doet → chaos, re-rendering, hallucinatie.

2. **"PIXEL-IDENTICAL" is een contradictie** — We eisen pixel-identiek maar vragen ook om relight + reflectievervanging. Die twee sluiten elkaar uit. Oplossing: splits in GEOMETRY LOCK (nooit veranderen) en PHOTOGRAPHIC ADJUSTMENTS (licht/reflecties mogen wél).

3. **Isolation als tussenstap** — Een neutrale achtergrond vóór composite maakt de taak voor de AI drastisch eenvoudiger.

4. **Relight als aparte stap** — Dit is waar "amateur → pro fotograaf" kwaliteit ontstaat. Na composite, niet ervoor.

---

## Plan: 5-staps Pipeline

```text
Step 0: Classify angle (ongewijzigd)
Step 1: CLEAN ONLY (cosmetisch, geen relight)
Step 2: ISOLATE (achtergrond → #404040 grijs)
Step 3: COMPOSITE (geïsoleerde auto + studio ref → plaatsing + schaduwen)
Step 4: RELIGHT (lak/reflecties → pro fotograaf look)
Step 5: VERIFY (bestaand + studio_consistent + cropped_vehicle checks)
```

### Step 1 — CLEAN ONLY (vervang huidige RETOUCH_PROMPT, r33-93)

Nieuwe prompt die ALLEEN cosmetisch werkt:
- Mag: vuil/stof/waterdruppels verwijderen, ruis reduceren, witbalans corrigeren, lak glans herstellen (polijsten, niet relighten), glas schoonmaken, band zwartpunt verdiepen
- Mag NIET: reflecties vervangen, LED streaks genereren, studio lighting simuleren, ramen donker maken, achtergrond veranderen, exposure drastisch wijzigen
- Model: `gemini-2.5-flash-image`

### Step 2 — ISOLATE (nieuw, na clean)

Nieuwe prompt:
- Vervang de VOLLEDIGE achtergrond door egaal #404040 donkergrijs
- Verander NIETS aan het voertuig: geen relight, geen reflectiewijziging, geen kleurverandering, geen geometrie
- Behoud de grond direct onder de wielen als subtiele overgang
- Model: `gemini-2.5-flash-image`

Waarom #404040 en niet chroma key (#00FF00): groen veroorzaakt kleurspill op metallic lak. Neutraal grijs is veilig.

### Step 3 — COMPOSITE (vervang huidige SHOWROOM_PROMPT, r96-323)

Ontvangt: geïsoleerde auto (grijs bg) + origineel (ground truth) + studio reference.

Drastisch vereenvoudigd t.o.v. nu omdat:
- Geen outdoor reflecties meer (achtergrond is al weg)
- AI hoeft niet te raden wat auto vs achtergrond is
- Focus ALLEEN op: plaatsing in studio, schaduwen, vloerreflectie, edge blending

Prompt bevat:
- Studio Environment matching (Image 3 exact)
- Vehicle Placement: fill 55-60%, margins 15% links/rechts, 12% boven dak, "when in doubt further away"
- Geometry/Detail Lock: velgen, koplampen, grille, badges, body lines, kleur — IDENTIEK aan Image 2
- Shadows: contact shadow (scherp bij band, 50-60% opacity) + ambient chassis shadow (20%, wide)
- Floor reflection: 5-8% opacity, blur, snel fading
- Edge blending: feathered 1-2px, geen halo
- GEEN relight instructies hier — dat doet Step 4
- Anti-mirror rule, camera height lock, zero-crop guarantee blijven
- Model: `gemini-3-pro-image-preview`

### Step 4 — RELIGHT (nieuw, na composite)

Dit is de "pro fotograaf" stap. Ontvangt: composited image + studio reference.

Prompt met 3 harde regels:
- **Rule A — Geometry Lock**: wheels/headlights/grille/badges/body lines — GEEN wijzigingen. "Do not redraw or invent missing details; preserve photographic texture."
- **Rule B — Paint/Glass Rendering Only**: alleen reflecties, licht, contrast, ramen mogen veranderen
- **Rule C — Studio Reflection Model**: lak moet reflecteren: soft dark gradients van studio walls, bright linear LED streaks van plafond, subtle floor reflections bij lagere panelen. Geen outdoor shapes.

Plus:
- Studio Lighting Blueprint (bestaand, verplaatst naar hier)
- Exposure Consistency (bestaand, verplaatst naar hier)
- Ramen: outdoor scenery → neutraal dark studio glas
- Model: `gemini-3-pro-image-preview`

### Step 5 — VERIFY (upgrade bestaande verificatie, r326-361)

Bestaande checks blijven + 2 nieuwe velden in JSON output:
- `studio_consistent`: boolean — komt de showroom overeen met de reference?
- `cropped_vehicle`: boolean — is een deel van de auto afgesneden?

Retry logica:
- `studio_consistent=false` → rerun composite (Step 3) met STRICT
- `cropped_vehicle=true` → rerun composite met "zoom out, never crop"
- `changed_parts` bevat wheels/lights → rerun relight (Step 4) met stricter geometry lock
- Mirroring/angle shift → bestaande retry logica

---

## Model configuratie

| Stap | Model | Reden |
|------|-------|-------|
| Classify | gemini-2.5-flash-lite | Snel, goedkoop, text-only |
| Clean | gemini-2.5-flash-image | Minimale wijzigingen |
| Isolate | gemini-2.5-flash-image | Eenvoudige taak |
| Composite | gemini-3-pro-image-preview | Beste kwaliteit |
| Relight | gemini-3-pro-image-preview | Pro fotograaf look |
| Verify | gemini-2.5-flash | Text-only analyse |

## Impact

- **+2 extra API calls** per foto (Isolate + Relight), waarvan 1 goedkoop (flash-image)
- **Elke stap heeft maar 1 verantwoordelijkheid** — geen conflicten meer
- **Relight na composite** = de auto past zich aan de studio aan, niet andersom
- **Verify met studio checks** vangt showroom drift op

## Pipeline flow wijzigingen (r517-620)

De `serve()` handler wordt aangepast:
1. Step 0: Classify (ongewijzigd)
2. Step 1: Clean → `enhancedImage`
3. Step 2: Isolate → `isolatedImage` (nieuw)
4. Step 3: Composite → `compositedImage` (ontvangt isolatedImage + original + studio ref)
5. Step 4: Relight → `relightedImage` (ontvangt compositedImage + studio ref)
6. Step 5: Verify → vergelijkt `relightedImage` met origineel
7. Retry logica: studio_consistent/cropped → retry composite; changed_parts → retry relight

Interior photos: alleen Clean stap (geen isolate/composite/relight).

## UI aanpassing (FotoStudio.tsx)

Processing stappen in de UI updaten naar de nieuwe 5 stappen:
1. Schoonmaken → 2. Isoleren → 3. Studio → 4. Belichting → 5. Controle

Timer thresholds aanpassen voor de extra stappen.

