

# Windshield Visibility Rule toevoegen

## Probleem
Het model ziet een klein stukje voorruit en maakt er alsnog een volledig raam van met showroom-elementen. De bestaande "proportional rule" is te abstract — het model heeft concrete percentage-drempels nodig.

## Wijziging

**Bestand:** `supabase/functions/showroom-photo-studio/index.ts`

**Locatie:** Regel 447-463 — de bestaande "WINDOW EDITING — PROPORTIONAL RULE" sectie wordt vervangen door een uitgebreide versie met de percentage-gebaseerde windshield visibility rule.

Nieuwe tekst:

```
WINDOW EDITING — PROPORTIONAL RULE:
- ONLY edit the exact window area that is visible in the original photo
- If only 10% of a window is visible in the frame, edit ONLY that 10% — do NOT reveal or generate the other 90%
- If a window is partially cropped by the edge of the photo, keep it cropped at the exact same position
- The showroom environment fills WHATEVER portion of the window is visible — no more, no less
- A small sliver of visible window gets a small sliver of showroom wall — NOT a full panoramic view
- Do NOT expand, extend, or complete any partially visible window
- Do NOT generate window frames, pillars, or door panels to "complete" a window that is cut off

WINDSHIELD VISIBILITY RULE — CRITICAL:
Before editing, estimate what percentage of the windshield is visible in the original photo.

- If 0-20% of the windshield is visible (only a thin strip at the top of the dashboard):
  → Replace ONLY that thin strip with a sliver of grey showroom wall (#6B6B6B)
  → NO ceiling track visible, NO spotlight pools — just the grey wall color filling that thin strip
  → Do NOT generate a full windshield view. Do NOT pull back to show more windshield.

- If 20-50% of the windshield is visible:
  → Replace that portion with grey showroom wall, optionally one partial spotlight pool
  → Still NO full windshield generation — only what was already visible

- If 50-100% of the windshield is visible:
  → Replace with full showroom wall + ceiling strip + 1-2 spotlight pools as per the showroom spec

The same percentage rule applies to SIDE WINDOWS and REAR WINDOW.

FORBIDDEN: Generating more windshield or window area than is visible in the original photo.
FORBIDDEN: Zooming out to make more window area visible so the showroom fits better.
FORBIDDEN: "Completing" a partially visible windshield by pulling the camera back.

The showroom adapts to the photo — the photo does NOT adapt to the showroom.

INTERIOR MIRROR: if visible, reflects the rear showroom wall with subtle warm spotlight
EXTERIOR SIDE MIRRORS (if visible from inside): reflect the side showroom wall
```

Daarna edge function redeployen.

