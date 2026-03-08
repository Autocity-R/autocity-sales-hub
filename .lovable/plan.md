

# Implementation Plan: Update Foto Studio Edge Function + Frontend

## 1. Replace Edge Function (`supabase/functions/showroom-photo-studio/index.ts`)
Replace the entire file with the new code from Manus. Key changes:
- Static `STUDIO_PROMPT` → dynamic `buildStudioPrompt(licensePlate?, shotAngle?)`
- New `ANGLE_DESCRIPTIONS` object for 8 camera angles
- Improved lighting instructions for dark cars
- Request body accepts `licensePlate` and `shotAngle`
- `BOARD_PROMPT` stays as a constant (minor wording refinements)
- Deploy automatically after saving

## 2. Update `CarPhotoUploader.tsx`
- Add `licensePlate?: string` to `CarPhotoUploaderProps`
- Pass `licensePlate` in the studio step invoke call (line 55): `{ imageBase64, step: "studio", licensePlate }`
- No `shotAngle` needed here

## 3. Update `FotoStudio.tsx`
Add two new optional inputs above the upload zone:
- **Kenteken input** (`licensePlate`): text field, optional
- **Hoek dropdown** (`shotAngle`): select with 8 Dutch-labeled options:
  - `front-left` → "3/4 voor links"
  - `side-left` → "Linker zijkant"
  - `rear-left` → "3/4 achter links"
  - `rear` → "Achterzijde"
  - `rear-right` → "3/4 achter rechts"
  - `side-right` → "Rechter zijkant"
  - `front-right` → "3/4 voor rechts"
  - `front` → "Voorzijde"

Pass both values in the `supabase.functions.invoke` call body (only when set).

## Files Changed
1. `supabase/functions/showroom-photo-studio/index.ts` — full replacement
2. `src/components/inventory/CarPhotoUploader.tsx` — add `licensePlate` prop, pass in API call
3. `src/pages/FotoStudio.tsx` — add kenteken input + hoek dropdown, pass in API call

