

## Fix: Dubbele Cron Job Verwijderen + Idempotency Guard

### Oorzaak
Er staan **twee cron jobs** met dezelfde naam `lisa-dagplanning-08u` in `cron.job`:
- **Job 9**: met `service_role` key (correct)
- **Job 10**: met `anon` key (duplicaat)

Beide draaien op `0 6 * * 1-5`, dus de `lisa-dagplanning` functie wordt **2x per trigger** aangeroepen → alle emails worden dubbel verstuurd.

### Oplossing

**Stap 1: Verwijder de dubbele cron job (SQL migratie)**
```sql
SELECT cron.unschedule(10);
```
Dit verwijdert job 10 (de duplicaat met anon key). Job 9 blijft actief.

**Stap 2: Idempotency guard in `lisa-dagplanning/index.ts`**
Als extra beveiliging tegen dubbele triggers: aan het begin van de functie checken of er vandaag al emails in de queue staan voor dezelfde dag. Als dat zo is, direct stoppen zonder nieuwe emails aan te maken.

```typescript
// Check of dagplanning vandaag al is gedraaid
const todayStart = new Date(); todayStart.setUTCHours(0,0,0,0);
const { data: existing } = await supabase
  .from('email_queue')
  .select('id')
  .gte('created_at', todayStart.toISOString())
  .ilike('payload->>subject', '%Dagplanning Aftersales%')
  .limit(1);

if (existing && existing.length > 0) {
  return new Response(JSON.stringify({ skipped: true, reason: 'Already ran today' }), ...);
}
```

### Bestanden

| Bestand | Actie |
|---------|-------|
| SQL migratie | `SELECT cron.unschedule(10)` — verwijder dubbele cron job |
| `supabase/functions/lisa-dagplanning/index.ts` | Idempotency guard toevoegen bovenin de functie |

### Resultaat
- Verkopers ontvangen voortaan **1x** per dag hun email om 08:00 CET
- Zelfs als de cron ooit weer per ongeluk dubbel triggert, voorkomt de idempotency guard dubbele emails

