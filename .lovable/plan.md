

# Fix: OpenAI API parameter naam fout

## Probleem

De edge function logs tonen duidelijk de fout:

> Unknown parameter: 'image'. For application/json on /v1/images/edits, use 'images' (array).

De OpenAI `gpt-image-1` JSON API verwacht `images` (array) in plaats van `image` (enkelvoud).

## Oplossing

In `showroom-photo-studio/index.ts`, wijzig de `callOpenAIImageEdit` functie:

```
// FOUT (huidige code):
image: imageBase64,

// CORRECT:
images: [imageBase64],
```

Dat is de enige wijziging die nodig is. Daarna moet de edge function opnieuw gedeployed worden.

