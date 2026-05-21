## Hertest Peugeot 2008 (kenteken 7195) met aangepaste Claude prompt

De inspectie staat al in de database:
- `id`: `a7b71a0b-e6ea-49db-be02-0c0b1488a0e2`
- status: `completed`, 60 frames aanwezig in storage
- Robin draait al op Claude (`claude-sonnet-4-6`), prompt v8 staat live in `ai_agents`

### Stappen

1. Reset inspectie naar `analyzing` (zodat realtime UI hem oppakt) en wis vorige resultaten:
   - `status = 'analyzing'`
   - `damages_found = null`, `report_pdf_url = null`, `analysis_summary = null`, `completed_at = null`
2. `intake-robin-analyse` opnieuw invoken met `inspection_id = a7b71a0b-...` — frames worden hergebruikt, geen video re-upload nodig.
3. Wachten op completion, PDF downloaden naar `/mnt/documents/robin-peugeot-2008-7195-rerun.pdf` en als artifact tonen zodat je kunt verifiëren:
   - Schaaf rechter achterdeur **wel** gedetecteerd
   - Footer = "Robin v8", cirkels i.p.v. rechthoeken, schone beschrijvingen
4. Als de schade nog steeds gemist wordt: damages JSON uit de DB lezen en samen kijken of het een prompt- of een filter-issue (zekerheid/vuil-check te streng) is — dan eventueel volgende prompt-tweak voorstellen.

Niets aan code/prompt wijzigen in deze run — dit is puur een hertest om te zien wat de huidige v8 prompt op deze video oplevert.