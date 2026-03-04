

# Plan: AutoCity Digital Studio — AI Foto Processor

## Overzicht

Een professionele "Studio" tab in VehicleDetails die meerdere voertuigfoto's tegelijk verwerkt via AI (Gemini image model). Elke foto wordt automatisch verbeterd, de auto wordt uitgesneden en geplaatst in een vaste AutoCity showroom-omgeving met LED-logo, reflecties, schaduwen en professionele verlichting.

## Architectuur

```text
┌──────────────────────────────────┐
│  VehicleDetails.tsx              │
│  Nieuwe tab: "Studio" (Sparkles) │
├──────────────────────────────────┤
│  ShowroomStudioTab.tsx           │
│  ├─ Multi-file drag & drop      │
│  ├─ Batch verwerking (parallel)  │
│  ├─ Per foto: loading / result   │
│  ├─ Origineel vs Studio toggle   │
│  └─ Download / Opslaan als foto  │
└──────────┬───────────────────────┘
           │ POST (per foto)
           ▼
┌──────────────────────────────────┐
│  Edge Function:                  │
│  showroom-photo-studio/index.ts  │
│  ├─ Base64 afbeelding ontvangen  │
│  ├─ Gemini image model aanroepen │
│  │   met gedetailleerde prompt   │
│  ├─ Resultaat opslaan in Storage │
│  └─ URL terugsturen              │
└──────────────────────────────────┘
```

## Wijzigingen

### 1. Edge Function: `supabase/functions/showroom-photo-studio/index.ts`

Ontvangt base64 afbeelding + vehicleId. Roept `google/gemini-2.5-flash-image` aan via Lovable AI Gateway met een uitgebreide prompt die het volledige ChatGPT-specificatiedocument implementeert:

**Prompt bevat:**
- Voertuig NIET aanpassen (kleur, wielen, badges, trim, koplampen, carrosserie, kentekenhouders intact)
- Beeldkwaliteit verbeteren: witbalans corrigeren, ruis verwijderen, scherpte verhogen, contrastverhogend, verf-reflecties herstellen
- Auto uitsnijden en plaatsen in vaste AutoCity showroom:
  - Donkergrijze matte muur met subtiele textuur
  - "AUTOCITY" verlicht LED-bord (wit licht) met auto-silhouet erboven
  - Dunne LED-strip langs plafondrand (neutraal wit licht)
  - Gladde gepolijste donkere betonvloer
- Realistische schaduwen onder banden (blur ~25px, opacity ~35%)
- Subtiele vloerreflectie van voertuig (opacity ~10%, blur ~40px, verticaal gespiegeld)
- Professionele studieverlichting met zachte overhead, gebalanceerde reflecties
- Subtiele rim-lighting voor donkere auto's (opacity ~10%)
- Consistente schaling (wielhoogte als referentiepunt)
- Minimale perspectiefcorrectie indien nodig (geen vervorming)
- **Interieur-detectie**: als foto een interieur is, alleen verlichting verbeteren + buitenachtergrond vervangen door donker AutoCity gradient

Resultaat wordt opgeslagen in `vehicle-documents` bucket, URL terug naar frontend.

### 2. Config: `supabase/config.toml`

```toml
[functions.showroom-photo-studio]
verify_jwt = false
```

### 3. Nieuw component: `src/components/inventory/detail-tabs/ShowroomStudioTab.tsx`

- **Multi-upload**: `react-dropzone` (al geïnstalleerd) voor drag & drop van meerdere bestanden (jpg/png, max 20MB per stuk)
- **Batch processing**: Alle foto's worden parallel verwerkt, elk met eigen loading state en voortgangsindicator
- **Resultaat grid**: Elke foto toont origineel en studio-versie naast elkaar met hover-vergelijking
- **Acties per foto**: Download (JPG), Opnieuw genereren, Opslaan als voertuigfoto (voegt toe aan vehicle.photos)
- **Bulk download**: Alle resultaten downloaden
- **Donkere preview achtergrond** voor professionele uitstraling
- **Error handling**: Rate limit (429) en credit (402) foutmeldingen via toast

### 4. Tab integratie: `src/components/inventory/VehicleDetails.tsx`

- Nieuwe "Studio" tab met `Sparkles` icoon in TabsList
- Grid kolommen aanpassen (6→7 normaal, 7→8 bij B2C)
- ShowroomStudioTab renderen met vehicle prop + onPhotoUpload voor "opslaan als voertuigfoto"

## Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/showroom-photo-studio/index.ts` | Nieuw — edge function met Gemini image editing |
| `supabase/config.toml` | Function registratie toevoegen |
| `src/components/inventory/detail-tabs/ShowroomStudioTab.tsx` | Nieuw — Studio tab met multi-upload UI |
| `src/components/inventory/VehicleDetails.tsx` | Studio tab toevoegen aan tabs |

## Bestaande infra die we hergebruiken

- `LOVABLE_API_KEY` secret (al aanwezig) voor Gemini API
- `vehicle-documents` storage bucket voor opslag resultaten
- `react-dropzone` package (al geïnstalleerd) voor multi-upload
- Bestaande `onPhotoUpload` handler voor "opslaan als voertuigfoto"

