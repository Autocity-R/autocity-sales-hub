

# Fix: "Maximum call stack size exceeded" in fetchImageAsBase64

## Probleem

De edge function logs tonen duidelijk de echte fout:

```
❌ Error: RangeError: Maximum call stack size exceeded
    at fetchImageAsBase64 (index.ts:111:22)
```

**Stap 1 (studio) werkt nu correct** — de OpenAI multipart/form-data call slaagt. Maar daarna crasht de functie bij `fetchImageAsBase64` op regel 125:

```typescript
btoa(String.fromCharCode(...new Uint8Array(buf)))
```

De spread operator (`...`) op een grote image array (miljoenen bytes) overschrijdt de maximale call stack. Dit gebeurt twee keer:
1. Regel 172: studio-resultaat ophalen voor stap 2
2. Regel 198: in de response builder

## Oplossing

Vervang de `fetchImageAsBase64` functie door een chunked versie die niet de spread operator gebruikt:

```typescript
async function fetchImageAsBase64(url: string): Promise<string> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`)
  const buf = await resp.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ""
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}
```

Dit is de enige wijziging. Bestand: `supabase/functions/showroom-photo-studio/index.ts`, regels 121-126.

