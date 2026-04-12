

## Plan: Cron jobs fixen — service_role key

### Actie

Via de Supabase SQL insert tool (niet migratie) in één keer uitvoeren:

1. **Unschedule** drie oude jobs (id 21, 22, 18)
2. **Schedule** drie nieuwe jobs met service_role key:
   - `marco-bpm-dagcheck-08u` — `0 6 * * 1-5` (ma-vr 08:00 CET)
   - `marco-bpm-weekoverzicht` — `0 7 * * 1` (maandag 09:00 CET)
   - `alex-leermoment-ma` — `0 4 * * 1` (maandag 06:00 CET)

### Bestanden

Geen code wijzigingen — alleen SQL uitvoeren.

