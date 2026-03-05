

# Plan: Hybride Pipeline — AI doet minder, code doet meer

## Diagnose (ChatGPT heeft gelijk)

Het huidige systeem vraagt AI om 5 dingen tegelijk in Stap 2:
- achtergrond vervangen
- logo exact kopiëren
- kenteken behouden
- kleur behouden
- exacte showroom architectuur repliceren

Generatieve AI kan dit niet consistent. Elke extra eis verlaagt de slagingskans exponentieel.

## Nieuwe Pipeline

```text
STAP 1: Retouch (AI) .............. blijft exact hetzelfde
STAP 2: Background Replace (AI) ... STERK VEREENVOUDIGD
STAP 3: Verify (AI) ............... VERSOEPELD
```

### Wat verandert in Stap 2 (SHOWROOM_PROMPT)

**Oud**: "Kopieer exact de showroom uit Image 1, inclusief logo, LED strips, muur textuur, en bewaar kenteken"
**Nieuw**: "Plaats het voertuig in een donkere, professionele autodealer showroom. Simpel. Geen specifiek logo, geen exacte architectuur."

Concrete wijzigingen:
- Verwijder referentie-image (Image 1) als input — AI hoeft niets meer te "kopiëren"
- Verwijder alle AUTOCITY logo instructies uit de prompt
- Verwijder nummerplaat-reconstructie eis (AI mag platen niet verwijderen, maar hoeft ze niet te "reconstrueren")
- Verwijder "match Image 1 exactly" — vervang door simpele showroom-beschrijving
- Houd WEL: kleur-eis, geometry lock, mirroring verbod, zero-crop guarantee
- Prompt wordt ~40 regels i.p.v. ~75

Nieuw SHOWROOM_PROMPT (kern):
```
You are given TWO images:
IMAGE 1 (Enhanced Vehicle): The retouched vehicle to place in a showroom.
IMAGE 2 (Original Vehicle — GROUND TRUTH): Unedited reference for all details.

Place the vehicle in a dark, professional car dealership showroom:
- Dark charcoal/anthracite walls
- Polished dark floor with subtle reflection
- Soft overhead LED lighting
- Clean, minimal, professional atmosphere

VEHICLE INTEGRITY: Keep EVERYTHING from Image 2 identical.
Do NOT change color, plates, wheels, lights, badges.
Do NOT mirror. Do NOT crop. Output 1920x1080.
```

Dit is ~60% korter en geeft AI maar 1 taak: background replacement.

### Wat verandert in Stap 3 (VERIFICATION_PROMPT)

- Verwijder check 6 (showroom_match) — niet meer relevant
- Verwijder check 7 (plates_preserved) — als AI ze niet verwijdert is het goed
- Houd: headlights, wheels, angle, mirroring, color
- **Versoepel severity**: alleen "high" bij mirroring of compleet verkeerde auto
- Minder retries, minder fallbacks

### Wat verandert in de pipeline logica

- `doComposite()` stuurt nog maar 2 images mee (enhanced + original) i.p.v. 3
- Referentie-image wordt niet meer opgehaald/meegestuurd
- `getReferenceImageBase64()` call in frontend kan weg (of behouden voor toekomstig gebruik)
- Verification response: `showroom_match` en `plates_preserved` velden verwijderen uit schema

### Toekomstige stap (niet in deze implementatie)

Logo overlay via code (canvas/PNG compositing) kan later toegevoegd worden als apart systeem. Nu eerst de AI-pipeline stabiliseren.

## Verwacht resultaat

- 80-90% minder fallbacks (AI heeft 1 simpele taak)
- Geen logo-drift meer (logo zit niet in AI output)
- Minder kleurproblemen (kortere prompt = betere opvolging)
- Sneller (1 image minder naar API)

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/showroom-photo-studio/index.ts` | SHOWROOM_PROMPT herschrijven, VERIFICATION_PROMPT vereenvoudigen, doComposite() aanpassen (2 images i.p.v. 3) |
| `src/pages/FotoStudio.tsx` | `getReferenceImageBase64()` call optioneel maken (reference wordt niet meer meegestuurd maar bewaren voor later) |

