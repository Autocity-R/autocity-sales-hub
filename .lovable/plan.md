

# Fix: OpenAI images parameter format

## Probleem

De edge function logs zijn heel duidelijk:

> Invalid type for 'images[0]': expected an object, but got a string instead.

De OpenAI `gpt-image-1` `/v1/images/edits` API verwacht dat elk item in de `images` array een **object** is met `type`, `media_type` en `data` velden — niet een kale base64 string.

## Oplossing

In `showroom-photo-studio/index.ts`, wijzig regel 97 van:

```typescript
images: [imageBase64],
```

naar:

```typescript
images: [{
  type: "base64",
  media_type: "image/png",
  data: imageBase64,
}],
```

Dat is de enige wijziging. Daarna opnieuw deployen.

| Bestand | Actie |
|---------|-------|
| `supabase/functions/showroom-photo-studio/index.ts` | Fix images parameter format (regel 97) |

