## Doel
De e-mail-footer krijgt het Auto City-logo links met een **oranje verticale scheidingsstreep** tussen logo en tekst (zoals in de screenshot). Dit geldt voor **alle drie de contract-e-mails**: tekenlink, koper-getekend, én verkoper-getekend. De verkoper-naam boven de footer komt (zoals nu al) uit voornaam + achternaam van de ingelogde verkoper (`profiles.first_name` + `profiles.last_name` via `salesperson_name` op het contract).

## Wijziging
Alleen de `renderContractEmail` helper aanpassen. Deze helper staat in twee edge functions (identieke kopieën) — beide krijgen exact dezelfde patch:
- `supabase/functions/contract-send/index.ts`
- `supabase/functions/contract-sign/index.ts`

### Footer-opmaak (exact als screenshot)
- Logo-cel: vast **zwart vierkant** ~64×64 px met het witte Auto City-logo binnenin (padding ~8 px, `border-radius:4px`, `background:#000000`). Kolom-breedte `width:72px`, `padding-right:0`.
- **Oranje verticale streep**: op de tekst-cel `border-left:3px solid #FF6B00;` + `padding-left:14px`. Dit geeft de streep die je in Gmail ziet, exact tussen logo en tekst.
- Tekst-cel inhoud blijft ongewijzigd: "Met vriendelijke groet,", verkoper-naam (bold), bedrijfsnaam, optioneel "Tel: {telefoon}", en `www.auto-city.nl` (oranje link).
- Table: `cellpadding=0 cellspacing=0`, cellen `vertical-align:middle` zodat streep netjes op logo-hoogte staat.

### Verkoper-naam (bevestiging huidige werking)
- `salesName` wordt in `contract-send` en `contract-sign` gelezen uit `doc.salesperson_name`, dat bij aanmaak wordt gezet op `${profiles.first_name} ${profiles.last_name}`. Blijft ongewijzigd — de screenshot toont "Hendrik Moesman", precies deze bron.

## Test
Hendrik verstuurt het testcontract opnieuw via "Opnieuw versturen" en tekent het daarna, om te bevestigen dat:
1. Tekenlink-mail toont logo + oranje streep + Hendrik Moesman.
2. Koper-getekend-mail (aan de klant) toont dezelfde footer.
3. Verkoper-getekend-mail (aan Hendrik zelf) toont dezelfde footer.

## Niet in scope
Geen wijzigingen aan document, PDF, tekenpagina of verzendlogica. Niet deployen — Hendrik doet dat zelf.
