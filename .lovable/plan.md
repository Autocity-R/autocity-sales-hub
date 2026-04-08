

## Fix: Lisa Dagplanning download knop werkt niet

### Probleem

De edge function `lisa-dagplanning` heeft twee problemen:

1. **Idempotency guard blokkeert downloads**: De functie checkt of er vandaag al een dagplanning email is verstuurd. Zo ja, stopt hij meteen met `{ skipped: true }`. Dit geldt ook voor handmatige download-verzoeken — die worden dus ook geblokkeerd.

2. **Geen download mode**: De functie leest de request body helemaal niet uit. Er is geen `mode: "download"` logica. De frontend verwacht `data.url` in het response, maar dat wordt nooit teruggegeven.

De frontend code (`LisaDashboard.tsx`) stuurt `{ mode: "download" }` maar de edge function negeert dit volledig.

### Oplossing

**Bestand: `supabase/functions/lisa-dagplanning/index.ts`**

1. **Parse de request body** aan het begin (na CORS check), haal `mode` eruit
2. **Sla de idempotency guard over** als `mode === "download"` — die guard is alleen bedoeld voor de automatische email, niet voor handmatige downloads
3. **Voeg download mode logica toe**: Na het genereren van de Excel, upload naar de `lisa-planningen` bucket en retourneer een signed URL (`{ url: "..." }`) zodat de frontend `window.open(data.url)` kan doen
4. **Bij email mode** (bestaand gedrag): bewaar de idempotency guard en stuur de email zoals nu

Concreet:
- Na `if (req.method === "OPTIONS")`, parse body: `const body = await req.json().catch(() => ({}))`
- Extract: `const mode = body?.mode || "email"`
- Verplaats idempotency guard achter een `if (mode !== "download")` check
- Na Excel generatie, als `mode === "download"`: upload naar bucket, maak signed URL (7 dagen), return `{ url }`
- Als `mode === "email"`: bestaande email logica (ongewijzigd)

### Technisch overzicht

| Bestand | Actie |
|---------|-------|
| `supabase/functions/lisa-dagplanning/index.ts` | Parse body, skip guard bij download, upload + signed URL retourneren |

