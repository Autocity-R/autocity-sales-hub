

## Fix: Excel als Bijlage + Data Verificatie

### Probleem 1: Download Excel knop werkt niet
De Lloyd email bevat een signed URL naar Supabase Storage. Gmail blokkeert/wrappt deze link, waardoor de knop niet werkt — zelfs na 1 seconde.

**Oplossing**: Excel als bijlage meesturen in de email. De `process-email-queue` ondersteunt al attachments (URL-based). De dagplanning hoeft alleen de signed URL als attachment mee te geven in de payload.

### Probleem 2: Verkeerde data in checklist email
De Peugeot 2008 GT en VW T-Roc staan NIET op `verkocht_b2c` in de database (ze staan op `voorraad` en `afgeleverd`). De code filtert correct op `status = 'verkocht_b2c'`. De eerdere test-email bevatte waarschijnlijk stale data van een eerder moment. De huidige 6 auto's zonder checklist zijn echte B2C-verkochte auto's (Audi Q4, BMW X3, Skoda Enyaq, VW ID.4, etc.).

---

### Wat er verandert

**Bestand: `supabase/functions/lisa-dagplanning/index.ts`**

1. Na het uploaden van de Excel naar storage, de signed URL als attachment toevoegen aan de Lloyd email payload:

```typescript
// In de Lloyd email insert:
payload: {
  senderEmail: "aftersales@auto-city.nl",
  to: ["lloyd@auto-city.nl"],
  subject: `Dagplanning Aftersales — ${datumDisplay}`,
  htmlBody: buildLloydEmailHtml(summary, datumDisplay), // geen downloadUrl meer nodig
  attachments: [{
    filename: `Dagplanning_${todayStr}.xlsx`,
    url: downloadUrl  // process-email-queue fetcht dit en stuurt als bijlage
  }]
}
```

2. `buildLloydEmailHtml` aanpassen: download knop verwijderen, vervangen door tekst "Excel in bijlage".

3. Signed URL expiry verhogen naar 604800 (7 dagen) als fallback voor de storage download.

---

### Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/lisa-dagplanning/index.ts` | Edit — Excel als attachment in Lloyd email + download knop verwijderen uit HTML |

### Geen wijziging nodig
- `process-email-queue/index.ts` — ondersteunt al attachments via URL fetch (regels 86-104)
- `lisa-email-checklist-reminder/index.ts` — data logica is correct, queries `verkocht_b2c`
- Geen cron wijzigingen

### Resultaat
Lloyd ontvangt elke dag de dagplanning Excel direct als bijlage in zijn inbox. Geen kapotte downloadlinks meer.

