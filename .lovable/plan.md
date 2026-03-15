

# Interior Prompt — Canvas Lock & Edge Matching toevoegen

## Wijziging

Eén toevoeging aan de **OUTPUT SPECIFICATION** sectie in `supabase/functions/showroom-photo-studio/index.ts` (regel 555-558). De bestaande regels blijven, de Canvas Lock + Edge Matching wordt ertussen gevoegd.

### Bestand: `supabase/functions/showroom-photo-studio/index.ts`

**Regel 555-558** wordt uitgebreid tot:

```
- Maximum resolution, identical to input dimensions and aspect ratio
- Exact same composition, crop, and framing as input — pixel-locked
- Photorealistic result — indistinguishable from a real professional photograph
- Suitable for use in automotive advertisement listings

CANVAS LOCK — ABSOLUTE:
Treat the input image as a FIXED CANVAS. You may only CHANGE pixels within this existing canvas.
You may NOT reveal, generate, or imply anything beyond the original edges.

EDGE MATCHING — MANDATORY:
The content at every edge of the output must match the content at the same edge of the input:
- TOP EDGE: If the input top edge shows dashboard trim or plastic → output top edge shows the same dashboard trim or plastic. NOT ceiling, NOT windshield, NOT sky.
- BOTTOM EDGE: If the input bottom edge shows center console or seat → output bottom edge shows the same. NOT floor, NOT extra space.
- LEFT EDGE: If the input left edge shows a door panel or seat side → output left edge shows the same. NOT a wider view of the door.
- RIGHT EDGE: Same rule applies.

If the original photo cuts off the windshield at the top: the output cuts off at the same point.
If the original photo cuts off the side window at the edge: the output cuts off at the same point.
FORBIDDEN: Completing, extending, or revealing any element that was cropped out of the original frame.
```

Daarna edge function redeployen.

