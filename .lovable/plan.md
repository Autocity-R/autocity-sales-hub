# Fix: getekend contract kan opnieuw ondertekend worden

## Root cause (bevestigd via DB-check)

`contract_signatures` van AC-RTD-2026-0005 heeft `status='getekend'` op het contract, maar op de handtekening-rij is `signed_at = NULL` en `pdf_path = NULL`. Daardoor blijft `get_contract_by_token()` de sign-UI teruggeven.

Oorzaak zit in `supabase/functions/contract-sign/index.ts` (rond regel 72-83): de update schrijft naar kolommen die niet bestaan in de tabel:

- code schrijft `ip_address` → tabel heeft `signer_ip`
- code schrijft `user_agent` → kolom bestaat helemaal niet

De update krijgt daardoor een PostgREST-fout, maar de code doet geen `if (upErr)`-check en gaat vrolijk door: `contract_documents.status` wordt wél op `getekend` gezet, PDF wordt geüpload, maar de signature-rij blijft ongewijzigd → `signed_at` blijft leeg → tokenlink toont opnieuw sign-UI.

## Fix

### 1. `supabase/functions/contract-sign/index.ts`
- Update-payload aanpassen aan echte schema: `signer_ip` i.p.v. `ip_address`, `user_agent`-veld verwijderen (of migratie toevoegen — kiezen voor verwijderen, is niet essentieel).
- Uitvoering foutbestendig maken: return van de `update(...)` opvangen en bij `error` een 500 teruggeven i.p.v. stilzwijgend doorgaan. Zelfde voor de `contract_documents`-update en de `vehicle_files`-insert.

### 2. Repareer bestaande vervuilde rijen (data fix)
Migratie die voor elke `contract_documents.status='getekend'` waarvan de bijbehorende `contract_signatures.signed_at IS NULL` de signature-rij bijwerkt met `signed_at = contract_documents.signed_at`. Zonder deze data-fix blijven AC-RTD-2026-0003 en AC-RTD-2026-0005 kapot.

Voor deze rijen bestaat er nog geen `pdf_path`, dus de "download getekend contract"-knop op de tekenpagina toont niets. Dat is acceptabel voor die twee oude testcontracten — de melding "Dit contract is al ondertekend op {datum}" verschijnt wél, wat het gerapporteerde probleem oplost.

### 3. Extra veiligheidsnet in de RPC (kleine harden-stap)
`get_contract_by_token()` uitbreiden zodat hij óók `already_signed` retourneert wanneer `contract_documents.status = 'getekend'`, zelfs als per ongeluk `contract_signatures.signed_at` leeg zou zijn. Voorkomt dat een schrijffout in de toekomst weer dezelfde symptomen geeft.

## Test

Na deploy:
1. Nieuw contract sturen, ondertekenen, dan de tekenlink opnieuw openen → moet direct "Dit contract is al ondertekend op {datum}" tonen met downloadknop.
2. Oude testcontracten (0003, 0005) via hun tekenlink openen → tonen ook al-getekend melding.

Niet publiceren; Hendrik test in preview.
