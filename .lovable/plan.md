## Wat ik wil doen

**1) Tiguan PDF direct beschikbaar**

De inspectie is succesvol afgerond (status `completed`, 22:55:42, 3 schades, categorie C, geen claim aanbevolen). Ik heb de PDF al opgehaald en lever hem hieronder als download.

<presentation-artifact path="Tiguan_inspectie_Robin.pdf" mime_type="application/pdf"></presentation-artifact>

**2) Realtime updates fixen (root cause)**

De React-hook `useIntakeInspections` heeft al een Supabase realtime-subscription op `intake_inspections`, maar de **tabel zit niet in de `supabase_realtime` publicatie**. Daarom komen er geen events binnen en zie je de statuswijziging pas als je het venster opnieuw opent.

Check uitgevoerd:
```
select * from pg_publication_tables 
where pubname='supabase_realtime' and tablename='intake_inspections';
→ leeg
```

**Fix via migratie:**
```sql
ALTER TABLE public.intake_inspections REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.intake_inspections;
```

Daarna:
- Frames uitgelezen → Robin analyseert → Klaar / Mislukt verschijnt **direct** in het Documenten-tabblad zonder het venster te sluiten.
- De bestaande subscription in `useIntakeInspections.ts` werkt dan zonder code-aanpassingen.

## Wat ik NIET aanraak

- Geen wijziging aan de edge function (analyse + PDF werken correct).
- Geen UI-aanpassing nodig (subscription staat er al).

Klik "Implement plan" en ik draai de migratie.