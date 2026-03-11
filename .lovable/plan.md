

# Master Prompt V9 Implementation

## Overview
Replace the current simple prompts with the validated Master Prompt V9 system. The key change: photos are processed **sequentially**, each using the previous result as a visual reference for consistency.

## Changes

### 1. Edge Function — `supabase/functions/showroom-photo-studio/index.ts`

**Replace prompts entirely:**
- Remove `buildStudioPrompt()` and `BOARD_PROMPT`
- Add `buildFirstPhotoPrompt(shotAngle, hasBumper)` — the full Master Prompt V9 for photo 1 (no reference)
- Add `buildSequentialPrompt(shotAngle, hasBumper, photoNumber)` — the Master Prompt V9 for photos 2-8 (with reference)
- Both prompts include studio environment, vehicle preservation contract, and AutoCity board rules inline — no separate "board" step needed anymore (single-pass processing)

**Add two-image Gemini call:**
- New function `callGeminiWithReference(inputBase64, referenceBase64, prompt)` that sends two images in the message content array (input photo first, reference photo second)

**New request parameters:**
- `referenceImageBase64` (string | null) — the previous processed photo
- `photoNumber` (number) — position in sequence (1-8)
- `shotAngle` (string) — camera angle

**Simplified flow:**
- No more two-step studio→board pipeline. Master Prompt V9 does studio + board in one pass
- If `photoNumber === 1` or no `referenceImageBase64`: use first photo prompt with single image
- If `photoNumber > 1` and `referenceImageBase64` provided: use sequential prompt with two images

**Storage path:** `showroom/vehicle_{vehicleId}/photo_{photoIndex}_{timestamp}.png`

### 2. Frontend — `src/pages/FotoStudio.tsx`

**Sequential processing (critical change):**
- Replace current parallel batch processing (`processAll` processes 2 at a time) with strict sequential processing
- Photo 1 → wait for result → Photo 2 (with photo 1 result as reference) → wait → Photo 3 (with photo 2 result) → etc.
- Store the result base64/URL on each `StudioImage` so it can be passed to the next call

**Updated `processImage`:**
- Accept optional `referenceImageBase64` parameter
- Send `photoNumber` (index + 1), `shotAngle`, and `referenceImageBase64` to edge function
- Remove the fake "board step" timer — single pass now, show "Verwerken..." status

**Updated `processAll`:**
```
for each image in order:
  get previousResult from images[index - 1]
  convert previousResult to base64 if available
  await processImage(image.id, photoNumber, referenceBase64)
```

**"Opnieuw genereren" button:**
- When regenerating photo N, use photo N-1's result as reference (or no reference if N=1)

**Remove two-step progress indicator** (Studio → Board) since it's now single-pass.

### 3. Database — New table `vehicle_showroom_photos` (optional, recommended)

```sql
CREATE TABLE vehicle_showroom_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  shot_angle TEXT NOT NULL,
  photo_index INTEGER NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vehicle_id, photo_index)
);
```

With RLS for authenticated users (select, insert, update). This allows storing all 8 showroom photos per vehicle instead of just one `showroom_photo_url`.

### Files Changed
- `supabase/functions/showroom-photo-studio/index.ts` — new prompts, reference image support, single-pass flow
- `src/pages/FotoStudio.tsx` — sequential processing, reference passing, simplified progress UI
- Database migration — `vehicle_showroom_photos` table

