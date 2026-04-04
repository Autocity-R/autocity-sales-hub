

# Plan: Import bescherming, timestamps trigger & warranty fix

## Database staat (bevestigd)

| Kolom | Bestaat al? |
|-------|------------|
| `rdw_protected` | Ja |
| `aanvraag_ontvangen_at` | Ja |
| `goedgekeurd_at` | Ja |
| `bpm_betaald_at` | Ja |
| `ingeschreven_at` | Ja |
| `aangekomen_at` | **Nee — moet aangemaakt** |
| `warranty_claims.customer_id` | **Nee — moet aangemaakt** |

De trigger `update_vehicle_import_timestamp` bestaat al maar vult alleen `import_updated_at` — de losse timestamp-velden worden niet gevuld.

---

## Stap 1: Database migratie

Eén migratie met `IF NOT EXISTS` / `CREATE OR REPLACE`:

- `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS aangekomen_at timestamptz;`
- `ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES contacts(id);`
- `CREATE OR REPLACE FUNCTION update_vehicle_import_timestamp()` — nieuwe body die bij elke `import_status` wijziging het juiste losse veld vult:
  - `aanvraag_ontvangen` → `aanvraag_ontvangen_at = now()`
  - `aangekomen` → `aangekomen_at = now()`
  - `goedgekeurd` → `goedgekeurd_at = now()`
  - `bpm_betaald` → `bpm_betaald_at = now()`
  - `ingeschreven` → `ingeschreven_at = now()`
  - Behoudt bestaande logica: `import_updated_at = now()` en `updated_at = now()`

## Stap 2: Webhook bescherming

`supabase/functions/sheets-import-webhook/index.ts` volledig aanpassen:

**Status hiërarchie** (met aangekomen op positie 3):
```text
niet_gestart(0) → niet_aangemeld(1) → aanvraag_ontvangen(2) → aangekomen(3) → goedgekeurd(4) → bpm_betaald(5) → ingeschreven(6)
```

**Vier beschermingen toevoegen vóór de update:**
1. **Inruil/leenauto skip** — als `details.isTradeIn = true` of `status = 'leenauto'` → skip met 200 + log
2. **RDW protected** — als `rdw_protected = true` → skip met 200 + log
3. **Transport check** — als `details.transportStatus = 'onderweg'` → alleen `niet_aangemeld` toestaan
4. **Hiërarchie check** — nieuwe status moet hogere index hebben dan huidige, anders skip

## Stap 3: Inruilauto's data-fix

Via insert/update tool (geen migratie):
```sql
UPDATE vehicles 
SET import_status = 'niet_gestart'
WHERE details->>'isTradeIn' = 'true' 
  AND status IN ('voorraad','verkocht_b2b','verkocht_b2c')
  AND import_status != 'niet_gestart';
```
Afgeleverde inruilauto's worden **niet** aangepast.

## Stap 4: TypeScript types

`src/types/inventory.ts` — `aangekomenAt` en `rdwProtected` toevoegen aan Vehicle interface.

## Bestanden die wijzigen

1. **Database migratie** — `aangekomen_at` kolom + `customer_id` FK + trigger replace
2. **`supabase/functions/sheets-import-webhook/index.ts`** — volledige beschermingslogica
3. **`src/types/inventory.ts`** — nieuwe velden

