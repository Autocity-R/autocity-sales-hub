

# Plan: Angle Classifier + Dual-Prompt Showroom Pipeline

ChatGPT's 3 upgrades zijn allemaal goed en ik sluit me erbij aan. Ze vullen het bestaande plan aan op precies de zwakke plekken.

## Wat er verandert (samenvatting)

### 1. Nieuwe stap: ANGLE_CLASSIFY_PROMPT (Stap 0)
- Tekst-only call naar `gemini-2.5-flash-lite` (goedkoop, snel)
- Retourneert exact 1 label uit 9 categorieën + `unknown`
- Bevat duidelijke definitie per hoek (bijv. "side = both wheels visible, front bumper barely visible")
- Bij `interior` → skip showroom, bij `unknown` → gebruik safe/strict prompt

### 2. Twee showroom prompts (normal + strict)

**SHOWROOM_PROMPT_NORMAL** (huidige prompt + angle lock):
- Injectie van `{ANGLE}` label als hard constraint
- "The input angle category is: {ANGLE}. Preserve this EXACT category."
- "Do NOT rotate to improve composition."

**SHOWROOM_PROMPT_STRICT** (voor retry en unknown):
- ZERO rotation, ZERO reframe, ZERO perspective change
- "Keep the car position/size exactly as input. Only replace background and adjust lighting."
- Gebruikt bij: retry na angle fail, of bij `unknown` classificatie

### 3. Verification uitbreiden met angle check
- Check 3 wordt: "The input was classified as {ANGLE}. Does the result match?"
- Toevoegen van `angle_preserved: boolean` aan JSON schema
- `angle_preserved: false` → high severity

### 4. Verbeterde fallback logica
- **Oud**: retry faalt → fallback naar enhanced photo (geen showroom)
- **Nieuw**: retry faalt → nog één poging met `SHOWROOM_PROMPT_STRICT` → als dat ook faalt, dán pas fallback naar enhanced photo
- Dit behoudt de uniforme showroom-look zoveel mogelijk

## Pipeline flow (nieuw)

```text
STAP 0: Classify angle (text-only, Flash Lite) → label
         ├─ interior → skip showroom
         ├─ unknown  → use STRICT prompt
         └─ known    → use NORMAL prompt with {ANGLE}
STAP 1: Retouch (ongewijzigd)
STAP 2: Showroom (NORMAL of STRICT, afhankelijk van stap 0)
STAP 3: Verify (met angle_preserved check)
         ├─ pass → done
         ├─ high severity → retry met STRICT prompt
         │    ├─ pass → done
         │    └─ fail → fallback enhanced photo
         └─ medium → accept met warning
```

## Concrete wijzigingen

| Locatie | Wat |
|---------|-----|
| Regels 8-44 | Ongewijzigd (RETOUCH_PROMPT) |
| Regels 46-98 | Vervangen door SHOWROOM_PROMPT_NORMAL + SHOWROOM_PROMPT_STRICT (twee constanten) |
| Regels 100-125 | VERIFICATION_PROMPT uitbreiden met angle check + `angle_preserved` |
| Na regel 156 | Nieuwe Stap 0: angle classify call + parsing |
| Regels 209-264 | `doComposite` aanpassen: accepteert `useStrict` parameter, kiest juiste prompt |
| Regels 328-394 | Retry logica: bij angle fail → retry met STRICT, bij dubbele fail → fallback |

Één bestand: `supabase/functions/showroom-photo-studio/index.ts`

