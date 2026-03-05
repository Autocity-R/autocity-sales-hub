

# Plan: Maximale beeldkwaliteit bij 1920x1080

## Analyse

De huidige prompts specificeren al 1920x1080 output — dat is correct voor AutoScout24, Marktplaats, etc. Wat ontbreekt zijn expliciete kwaliteitseisen. De AI krijgt nu geen instructie over ruis, artefacten, of scherpte van de showroom-omgeving.

## Wijzigingen

**Bestand: `supabase/functions/showroom-photo-studio/index.ts`**

### 1. Kwaliteitsblok toevoegen aan SHOWROOM_PROMPT_NORMAL (na regel 138, voor het OUTPUT blok)

```
━━━ IMAGE QUALITY (CRITICAL) ━━━
- Output must be ULTRA HIGH QUALITY at 1920x1080 — maximum sharpness, zero noise.
- The showroom environment (walls, floor, ceiling) must be PERFECTLY SMOOTH — no grain, no noise, no compression artifacts, no color banding.
- Floor reflection must be crisp and clean — no pixelation.
- Lighting gradients must be smooth — no visible banding or stepping.
- The vehicle must retain ALL fine detail: paint texture, badge text, spoke edges, panel gaps, headlight internals.
- The image must look like a professional DSLR photograph — NOT like an AI render.
- NO film grain. NO noise. NO soft focus on background. Tack-sharp everywhere.
```

### 2. Zelfde kwaliteitsblok toevoegen aan SHOWROOM_PROMPT_STRICT (na regel 189)

### 3. Kwaliteitsregel toevoegen aan RETOUCH_PROMPT (na regel 69)

```
━━━ OUTPUT QUALITY ━━━
- Maximum sharpness — no added noise, no grain, no compression artifacts.
- All fine details (badge text, spoke edges, panel gaps, headlight internals) must remain tack-sharp.
```

Drie kleine prompt-toevoegingen, geen logica-wijzigingen. Resolutie blijft 1920x1080.

