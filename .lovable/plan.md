

## Plan: Fix Alex briefing email payload

### Probleem
In `alex-dagelijkse-briefing/index.ts` wordt `to` als string gezet (`'hendrik@auto-city.nl'`), maar `process-email-queue` verwacht een array en roept `.to.join()` en `.to[0]` aan.

### Fix
In `supabase/functions/alex-dagelijkse-briefing/index.ts` — twee plekken waar `email_queue.insert` wordt aangeroepen:

1. **Briefing email** (rond regel 197): `to: 'hendrik@auto-city.nl'` wordt `to: ['hendrik@auto-city.nl']`
2. **Urgent alert email** (rond regel 210): zelfde fix

### Deploy
Na de fix: deploy `alex-dagelijkse-briefing` edge function.

### Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/alex-dagelijkse-briefing/index.ts` | Fix `to` van string naar array (2 plekken) |

