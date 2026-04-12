

## Plan: Watermerk-systeem voor garantie emails + system_config tabel

### Wat
Een `system_config` tabel toevoegen als generiek key-value store, en de `process-garantie-emails` edge function zo aanpassen dat alleen emails na het laatste sync-moment worden opgehaald — geen historische inbox.

### Database

**Nieuwe tabel: `system_config`**
- `key` (text, PRIMARY KEY)
- `value` (text)
- `updated_at` (timestamptz, default now())
- Initiële rij: `garantie_email_laatste_sync` met huidige timestamp
- RLS: service_role full access, authenticated read-only

### Edge Function aanpassing

In `process-garantie-emails/index.ts` (die we nog gaan bouwen als onderdeel van het Sara email plan):

1. **Bij start**: watermerk ophalen uit `system_config` (`garantie_email_laatste_sync`)
2. **Gmail query**: `after:` parameter gebruiken met het watermerk-tijdstip (Unix timestamp)
3. **Na succesvolle verwerking**: watermerk updaten naar `now()`
4. **Dubbele beveiliging**: `message_id` UNIQUE constraint bestaat al op `garantie_emails` — als een email toch twee keer binnenkomt, wordt de insert genegeerd via `ON CONFLICT DO NOTHING`

### Bestanden

| Bestand | Actie |
|---------|-------|
| Migratie | `system_config` tabel + RLS + initiële rij |
| `supabase/functions/process-garantie-emails/index.ts` | Watermerk logica integreren (onderdeel van het grotere Sara email plan) |

### Opmerking
Dit wordt meegenomen in de implementatie van het volledige Sara garantie email systeem — het watermerk is onderdeel van dezelfde edge function. De `system_config` tabel is herbruikbaar voor toekomstige systeeminstellingen.

