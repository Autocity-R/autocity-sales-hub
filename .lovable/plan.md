

# Interieur Prompt V4 — Partial Window Fix & Button Preservation

## Root Cause Analysis

The problem is in **Rule #2, lines 439-445** — the "WINDOW VIEWS — PERSPECTIVE RULES" section. When the AI sees even a tiny sliver of windshield in a steering wheel close-up, it reads:

> "Through WINDSHIELD: flat showroom wall fills the majority, thin strip of light grey ceiling at the absolute top edge only"

This instructs the AI to create a **full windshield view** with wall and ceiling — so it zooms out to make room for that. The strict per-window descriptions are **counterproductive** for partial views and close-ups. They override the pixel-lock rule because the AI thinks it *must* show a full wall through the windshield.

## Changes to `buildInteriorPrompt()` in `supabase/functions/showroom-photo-studio/index.ts`

### 1. Rule #1 — Add explicit button/control/display preservation

After the "DASHBOARD AND INFOTAINMENT" section (line 385-388), expand to:

```
DASHBOARD AND INFOTAINMENT:
- Dashboard layout, gauge cluster design, and all physical controls — identical
- Infotainment screen: preserve the exact screen UI, icons, and layout visible in the input
- ALL buttons, knobs, dials, switches, touch controls, and physical controls MUST remain pixel-identical
- ALL information displays, gauge readings, warning lights, and indicator icons MUST show the exact same content as the input
- Climate control settings, temperature readings, fan speed indicators — all identical
- Steering wheel buttons, scroll wheels, and paddle shifters — all identical
- FORBIDDEN: Changing the dashboard shape or layout
- FORBIDDEN: Changing any button label, icon, or display reading
- FORBIDDEN: Altering the content shown on any screen or display
```

### 2. Rule #2 — Replace rigid per-window rules with proportional approach

Remove the current "WINDOW VIEWS — PERSPECTIVE RULES" block (lines 439-445) and replace with:

```
WINDOW EDITING — PROPORTIONAL RULE:
- ONLY edit the exact window area that is visible in the original photo
- If only 10% of a window is visible in the frame, edit ONLY that 10% — do NOT reveal or generate the other 90%
- If a window is partially cropped by the edge of the photo, keep it cropped at the exact same position
- The showroom environment fills WHATEVER portion of the window is visible — no more, no less
- A small sliver of visible window gets a small sliver of showroom wall — NOT a full panoramic view
- Do NOT expand, extend, or complete any partially visible window
- Do NOT generate window frames, pillars, or door panels to "complete" a window that is cut off

What to show in the visible window area:
- Grey micro-cement wall (#6B6B6B to #787878) as the dominant element
- 0-1 warm spotlight pool IF the visible window area is large enough to warrant it
- Thin strip of light grey ceiling (#C8C8C8) ONLY if the very top of the windshield is visible
- Dark floor (#3A3A3A) ONLY if the very bottom edge of a side window is visible

INTERIOR MIRROR: if visible, reflects the rear showroom wall with subtle warm spotlight
EXTERIOR SIDE MIRRORS (if visible from inside): reflect the side showroom wall
```

### 3. Rule #0 — Strengthen the close-up framing instruction

Add one more line to the close-up section (after line 367):

```
- Seeing a PARTIAL window in a close-up does NOT mean you should zoom out to show the FULL window — edit only the visible portion and keep everything else exactly as-is
- The amount of visible showroom must be PROPORTIONAL to the amount of visible window in the original — a tiny window sliver means a tiny showroom sliver
```

### Summary

| Problem | Cause | Fix |
|---------|-------|-----|
| Zooms out at steering wheel close-up | "Through WINDSHIELD: wall fills majority" forces full view | Proportional rule: edit only visible portion |
| Dashboard photo expands to show full windows | Per-window rules imply full windows needed | Remove rigid per-window specs, add "do NOT complete partial windows" |
| Buttons/displays changed | Not explicitly protected | Explicit preservation of all controls, readings, display content |

