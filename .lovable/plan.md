
# Fix: Dubbele schadeherstel registraties voorkomen

## Probleem

Yousry's taken worden meerdere keren geregistreerd in de rapportages. Uit database-analyse blijkt:
- **50 records** in de database, maar slechts **32 unieke taken** -- **18 duplicaten**
- Een taak heeft zelfs **7 dubbele entries** (binnen 10 seconden)

## Oorzaak (drie problemen tegelijk)

1. **Dubbele registratie**: Zowel de app-code (`registerDamageRepair` in taskService.ts) als een database-trigger (`auto_damage_repair_trigger`) proberen allebei een record aan te maken bij het voltooien van een taak
2. **Geen uniek constraint**: De tabel `damage_repair_records` heeft geen UNIQUE constraint op `task_id`, waardoor de EXISTS-check bij gelijktijdige requests faalt
3. **Geen dubbelklik-beveiliging**: De "Markeer als voltooid" knop kan meerdere keren snel achter elkaar worden ingedrukt

## Oplossing (drie lagen)

### 1. Database: UNIQUE constraint toevoegen + duplicaten opruimen
- Verwijder alle bestaande duplicaten (behoud oudste record per task_id)
- Voeg een `UNIQUE` constraint toe op `task_id` zodat de database dubbele inserts weigert
- Pas de database-trigger aan met `ON CONFLICT DO NOTHING`

### 2. App-code: dubbele registratie verwijderen
- Verwijder de `registerDamageRepair()` aanroep uit `updateTaskStatus()` in taskService.ts -- de database-trigger doet dit al
- Dit elimineert de race condition tussen app en trigger

### 3. Client-side: dubbelklik-beveiliging
- Voeg een `disabled` state toe aan de "Markeer als voltooid" knoppen in alle vier de componenten:
  - `DraggableTaskList.tsx`
  - `TaskListOptimized.tsx`
  - `TaskMobileCard.tsx`
  - `TaskDetail.tsx`
- Knop wordt direct disabled na eerste klik en toont een loading state

## Technische details

### Stap 1: SQL migratie

```text
-- Verwijder duplicaten (behoud oudste per task_id)
DELETE FROM damage_repair_records
WHERE id NOT IN (
  SELECT DISTINCT ON (task_id) id
  FROM damage_repair_records
  ORDER BY task_id, created_at ASC
);

-- Voeg UNIQUE constraint toe
ALTER TABLE damage_repair_records
ADD CONSTRAINT damage_repair_records_task_id_unique UNIQUE (task_id);

-- Update trigger met ON CONFLICT
CREATE OR REPLACE FUNCTION auto_register_damage_repair_on_completion()
  ...
  INSERT INTO damage_repair_records (...) VALUES (...)
  ON CONFLICT (task_id) DO NOTHING;
```

### Stap 2: taskService.ts
- Verwijder de `registerDamageRepair()` aanroep op regel 428-430 in `updateTaskStatus()`
- De functie `registerDamageRepair` zelf kan blijven als fallback in `updateTask()`

### Stap 3: UI componenten (4 bestanden)
- Voeg `isCompleting` state toe
- Disable de knop en toon spinner tijdens verwerking

| Bestand | Wijziging |
|---------|-----------|
| SQL migratie (nieuw) | Duplicaten opruimen, UNIQUE constraint, trigger updaten |
| `src/services/taskService.ts` | Dubbele registerDamageRepair call verwijderen |
| `src/components/tasks/DraggableTaskList.tsx` | Dubbelklik-beveiliging |
| `src/components/tasks/TaskListOptimized.tsx` | Dubbelklik-beveiliging |
| `src/components/tasks/TaskMobileCard.tsx` | Dubbelklik-beveiliging |
| `src/components/tasks/TaskDetail.tsx` | Dubbelklik-beveiliging |

## Verwacht resultaat
- 18 dubbele records worden verwijderd
- Nieuwe duplicaten zijn onmogelijk (database UNIQUE constraint)
- Rapportages tonen correcte aantallen voor Yousry en alle medewerkers
