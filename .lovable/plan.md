

## Plan: Fix Daan B2B email — verkeerde payload keys

### Probleem
De `daan-b2b-analyse` edge function stuurt de email met verkeerde payload keys:
- `from` → moet `senderEmail` zijn
- `html` → moet `htmlBody` zijn

De `process-email-queue` verwacht `senderEmail` en `htmlBody` (zie het `EmailPayload` interface). Doordat `htmlBody` undefined is, komt er een lege email. Doordat `senderEmail` undefined is, valt hij terug op `inkoop@auto-city.nl`.

Er is ook geen Excel bijlage gekoppeld aan de email — de signed URL staat alleen als link in de HTML maar niet als attachment.

### Wijzigingen

**Bestand: `supabase/functions/daan-b2b-analyse/index.ts` (regel 868-876)**

Verander de payload keys:
```typescript
await supabase.from("email_queue").insert({
  status: "pending",
  payload: {
    senderEmail: "verkoop@auto-city.nl",
    to: ["hendrik@auto-city.nl"],
    subject: `B2B Kansen ${datum} — ...`,
    htmlBody: emailHtml,
    attachments: signedUrl?.signedUrl ? [{
      filename: filename,
      url: signedUrl.signedUrl,
    }] : [],
  },
});
```

Dit fixt:
1. **Lege email body** — `html` → `htmlBody`
2. **Verkeerde afzender** — `from` → `senderEmail`
3. **Geen bijlage** — Excel wordt nu als attachment meegestuurd (naast de download link in de HTML)

### Wat NIET verandert
- Excel generatie, upload naar storage — ongewijzigd
- Email HTML template — ongewijzigd
- Download mode — ongewijzigd

| Bestand | Actie |
|---------|-------|
| `supabase/functions/daan-b2b-analyse/index.ts` | Fix payload keys + voeg Excel attachment toe |

