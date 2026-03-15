
# Interieur Prompt Vervangen

## Wat verandert

**Bestand:** `supabase/functions/showroom-photo-studio/index.ts`

### 1. `buildInteriorFirstPrompt()` — regels 266-392
Volledige return string vervangen door het nieuwe prompt. Belangrijkste wijzigingen t.o.v. het huidige prompt:
- Nieuwe opening met "world's best automotive photo editor and retoucher" rol (was "forensic automotive interior photo specialist")
- Toegevoegde expertise-beschrijving (fotograaf + retoucher combo)
- 5 expliciete **HARDE EISEN** als gestructureerde secties (compositie, booth alleen door ramen, schermglas reflecties, camera display, geen branding)
- Gedetailleerde booth specificaties met exacte afmetingen en hex kleurcodes
- Vereenvoudigde retouche- en bewaar-secties (geen stappen-nummering meer, compactere format)
- Geen "STEP" structuur meer — alles in benoemde secties

### 2. `buildInteriorSequentialPrompt(photoNumber)` — regels 394-483
Zelfde nieuwe prompt, maar met een consistency reference blok bovenaan:
- Vermelding dat dit foto `${photoNumber}` is
- Instructie om verlichting, showroom omgeving en kleurgrading exact te matchen met de reference image
- Alle 5 HARDE EISEN blijven identiek

### Geen andere wijzigingen
- Geen structurele wijzigingen aan de pipeline, API calls of storage
- Edge function wordt automatisch herdeployed
