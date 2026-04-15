

## Plan: JP Cars sync herstellen

### Probleem
De `unique_license_plate_sync_date` constraint op `jpcars_voorraad_monitor` blokkeert inserts omdat meerdere voertuigen hetzelfde kenteken kunnen hebben (imports zonder kenteken = allemaal 'NB' of leeg). De tabel is nu leeg — Kevin en Alex zien geen voorraaddata.

### Oplossing

**Stap 1 — Constraint verwijderen (migratie)**
```sql
ALTER TABLE public.jpcars_voorraad_monitor 
  DROP CONSTRAINT unique_license_plate_sync_date;
```

**Stap 2 — Handmatige sync testen**
Na de migratie de sync knop in Kevin's dashboard gebruiken om te bevestigen dat de voorraad weer binnenkomt via de JP Cars API.

### Resultaat
- Kevin ziet weer de volledige voorraadmonitor
- Alex kan weer marktdata ophalen via zijn JP Cars tools
- De hourly cron job (al gecorrigeerd naar service_role) vult de data automatisch aan

### Bestanden
Geen codewijzigingen — alleen de database constraint verwijderen.

