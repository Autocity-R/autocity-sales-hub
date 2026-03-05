

# Plan: Nieuwe showroom reference + auto groter in beeld + minder reflectie

## Wijzigingen

### 1. Studio reference image vervangen
De geüploade showroom-foto (donkere kamer met LED-strip rectangle aan plafond, gepolijste betonvloer) wordt gekopieerd naar `public/autocity-studio-reference.jpg`, ter vervanging van de huidige reference.

### 2. Auto groter in beeld — vehicle placement aanpassen
In beide prompts (`SHOWROOM_PROMPT_NORMAL` regel 136-138 en `SHOWROOM_PROMPT_STRICT`) staat nu:
```
- Center horizontally, fill ~55-65% of image width
```
Dit wordt verhoogd naar **~65-80%** zodat de auto prominenter in beeld komt en het "te ver weg"-effect verdwijnt.

### 3. Vloerreflectie verminderen
In beide prompts staat nu:
```
- Subtle floor reflection matching the style in Image 3 (~10% opacity, blurred, fading)
```
Dit wordt verlaagd naar **~5% opacity** met extra instructie: "Floor reflection must be BARELY visible — just a faint hint, not a mirror effect."

### Samenvatting

| Locatie | Wijziging |
|---------|-----------|
| `public/autocity-studio-reference.jpg` | Vervangen door geüploade showroom-foto |
| `SHOWROOM_PROMPT_NORMAL` regel 136-138 | Vehicle fill 55-65% → 65-80% |
| `SHOWROOM_PROMPT_NORMAL` regel 142 | Reflectie 10% → 5%, barely visible |
| `SHOWROOM_PROMPT_STRICT` regel 201-203 | Zelfde reflectie-aanpassing |
| `SHOWROOM_PROMPT_STRICT` (vehicle placement) | Zelfde fill-aanpassing toevoegen |

