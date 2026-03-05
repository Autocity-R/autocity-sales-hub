

# Analyse: Vaste Studio Referentie vs Generatieve Showroom

## Het kernprobleem

ChatGPT heeft gelijk: we laten AI elke keer een **nieuwe** showroom genereren. Dat geeft per definitie variatie — andere vloer, andere lichtlijnen, andere wanden. Dit is niet op te lossen met een betere tekstbeschrijving. Hoe gedetailleerd de prompt ook is, generatieve modellen produceren altijd variatie.

## Wat ChatGPT voorstelt: reference image

De oplossing is om een **vaste studio-foto** als 3e input mee te sturen en de AI te instrueren: "zet de auto IN deze studio, genereer geen nieuwe." Dit is wat we eerder hadden maar toen verwijderden omdat we vroegen om logo's en architectuur exact te kopiëren — dat was te complex. Nu vragen we alleen: gebruik dezelfde kamer.

## Wat ik wil aanpassen

### 1. Reference studio image terug als 3e input

In `doComposite()` (regel 363-419) wordt nu 2 images meegestuurd (enhanced + original). We voegen een 3e image toe: een vaste studio reference. Deze wordt als base64 hardcoded in de edge function of opgehaald uit storage.

**Praktisch**: Een neutrale, donkere studio-foto zonder auto erin. Donkere wanden, gepolijste vloer, LED-plafondlijn. We kunnen hier de beste output die we al hebben als template gebruiken, of een specifieke lege showroom foto.

### 2. SHOWROOM_PROMPT_NORMAL en _STRICT herschrijven

**Oud** (regel 79-86): tekst-beschrijving van de showroom
**Nieuw**: "Image 3 is your STUDIO REFERENCE. Place the vehicle into this exact studio. Match the walls, floor, ceiling, lighting exactly. Do NOT generate a new room."

Dit reduceert de creatieve vrijheid van de AI tot nul voor de achtergrond.

### 3. Mirroring versterking

De huidige prompts zeggen al "NEVER mirror" maar het werkt niet altijd. Toevoegen van een concreet visueel anker:

```
ANTI-MIRROR CHECK:
Look at where the LICENSE PLATE is in Image 2.
The plate must appear on the SAME SIDE of the output image.
If plate is on the LEFT in Image 2 → it must be on the LEFT in output.
Reversing left↔right = CRITICAL FAILURE.
```

### 4. Camera height lock

Toevoegen aan beide showroom prompts:

```
CAMERA HEIGHT LOCK:
The camera height and horizon line must match Image 1 exactly.
Do NOT raise or lower the camera viewpoint.
Do NOT tilt. Do NOT change the horizon.
```

## Wat er nodig is voor de reference image

We hebben een "lege showroom" foto nodig. Twee opties:

**Optie A**: Een van de huidige goede outputs gebruiken als reference (maar dan zit er een auto in)
**Optie B**: AI één keer een lege showroom laten genereren en die opslaan als vaste template

Optie B is beter — een lege kamer als template is schoner voor compositing.

## Concrete wijzigingen

| Locatie | Wijziging |
|---------|-----------|
| `doComposite()` regel 363-419 | 3e image (studio reference) toevoegen aan de API call |
| `SHOWROOM_PROMPT_NORMAL` regel 71-130 | Herschrijven: "Image 3 = studio reference, match exact" |
| `SHOWROOM_PROMPT_STRICT` regel 132-167 | Zelfde aanpassing |
| Beide prompts | Anti-mirror regel met kentekenplaat-anker |
| Beide prompts | Camera height lock toevoegen |
| Nieuw: studio reference | Base64 van lege showroom als constante, of opslaan in Supabase storage |

## Verwacht resultaat

- Elke foto krijgt dezelfde showroom (zelfde vloer, wanden, licht)
- Minder mirroring door visueel anker (kentekenplaat)
- Stabielere camera-hoogte bij zij-aanzichten
- Fotoreportage van 1 auto ziet eruit als echte studio-shoot

## Open vraag

Heb je een lege showroom-foto die je wilt gebruiken als reference? Of zal ik er één laten genereren door AI als vaste template?

