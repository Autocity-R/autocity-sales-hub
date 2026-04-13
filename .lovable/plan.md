

## Analyse: Waarom Sara Dashboard leeg is

### Probleem 1: Claims tonen 0 — verkeerde kolomnaam
Het dashboard filtert op `status` maar de kolom heet `claim_status`. De query op regel 28:
```
.or('status.eq.open,status.eq.in_behandeling,status.eq.pending')
```
Moet zijn:
```
.or('claim_status.eq.open,claim_status.eq.in_behandeling,claim_status.eq.pending')
```
Er zijn 12 pending claims en 88 resolved — die 12 moeten zichtbaar worden.

### Probleem 2: Garantie emails inbox leeg — edge function nooit gedraaid
De `process-garantie-emails` function heeft **nul logs** — hij is nooit aangeroepen. De cron job is niet ingesteld. De function moet:
1. Gedeployed worden
2. Handmatig getest worden met een curl-call
3. Cron job ingesteld worden (elke 10 minuten)

### Probleem 3: Kolom-mismatches in claims query
Het dashboard probeert `loan_vehicle:loan_car_id(...)` te joinen maar `vehicles` heeft mogelijk andere kolomnamen. En velden als `description` bestaan niet — het heet `description` (dat klopt wel). Maar `manual_customer_name` en andere velden moeten geverifieerd worden tegen de echte kolommen.

---

### Plan

| Stap | Actie |
|------|-------|
| 1 | **SaraDashboard.tsx**: Fix `status` → `claim_status` in alle queries |
| 2 | **Deploy** `process-garantie-emails` edge function |
| 3 | **Test** de edge function met een curl-call om te verifiëren dat Gmail-connectie werkt |
| 4 | **Cron job** instellen via SQL voor automatische 10-minuten verwerking |

### Technisch detail
- `warranty_claims` kolom is `claim_status` (niet `status`)
- Waarden in DB: `pending` (12 stuks), `resolved` (88 stuks)
- `garantie_emails` tabel bestaat maar is leeg — function moet draaien
- `system_config.garantie_email_laatste_sync` staat op 13 maart 2026 — emails vanaf dat moment worden opgehaald

