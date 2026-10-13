# Website-reservering: auto op verkocht B2C na €1.000 iDEAL-aanbetaling

Dit is alleen een toevoeging. Bestaande functies, triggers, UI en agenda-onderdelen blijven ongewijzigd.

## Voorkeur voor matching: Optie A (kenteken + VIN)
Optie B (merk + model + km + prijs) is onbetrouwbaar. Prijzen en km-standen verschillen tussen LMS en CRM, en bij twee dezelfde modellen ontstaat een dubbele match.

Regel:
1. Vergelijk het VIN zonder spaties en zonder onderscheid in hoofdletters. Er moet precies 1 auto gevonden worden.
2. Geen VIN meegestuurd? Vergelijk dan het genormaliseerde kenteken (zonder streepjes, hoofdletters). Ook hier moet precies 1 auto gevonden worden.
3. Komt de auto in VIN en kenteken allebei voor maar is het niet dezelfde auto: 409.
4. Status moet `voorraad` zijn. Is het `verkocht_b2c` met dezelfde betaling_id: geef ok terug, het is een herhaling. Elke andere status: 409 (`al_verkocht`).
5. 0 treffers: 404. Meer dan 1 treffer: 409. Altijd vastleggen in het logboek, nooit raden.

Het advertentienummer en hexon_nr worden bewaard in `details.websiteReservering`. Zo is de koppeling later terug te vinden.

## Verloop van de functie
1. Alleen `POST` (plus `OPTIONS`/CORS). De header `x-reservering-secret` wordt in vaste tijd vergeleken met `RESERVERING_SECRET`. Klopt die niet: 401 (ook gelogd).
2. De body wordt gecontroleerd met Zod: betaling_id, bedrag, betaald_op, de klantgegevens met e-mail, en kenteken en/of vin. Ongeldig: 400.
3. **Idempotent:** bestaat er in het logboek al een rij met deze `betaling_id` en `resultaat='ok'`, dan komt meteen `{ok:true, vehicle_id, herhaald:true}` terug. Er wordt dan niets gewijzigd. Daarnaast voorkomt een unieke index op de geslaagde betaling_id dat twee gelijktijdige aanroepen allebei slagen.
4. **Auto zoeken** volgens de regel hierboven.
5. **Contact:** zoek met `ilike` op e-mail (hoofdletters maken niet uit). Is er al een contact, dan worden alleen lege velden aangevuld; bestaande gegevens worden niet overschreven. Geen contact gevonden: nieuw contact met `type='b2c'`, `is_car_dealer=false`, voornaam, achternaam, telefoon, `address_street`, `address_number`, `address_postal_code` en `address_city`.
6. **Verkoper:** opzoeken in `profiles` op `email = 'hendrik@auto-city.nl'`. Dat levert 1 rij op (id 6d62becf…, rol owner). Op naam zoeken is niet veilig, want "Moesman" komt twee keer voor (ook Peter). Het e-mailadres komt in de vaste instelling `system_config.website_reservering_verkoper_email`. Zo kan het later worden aangepast zonder de functie te wijzigen. Het veld `verkoper` uit de body wordt alleen gelogd.
7. **Auto bijwerken** (met de service-role-sleutel, op dezelfde velden als de B2C-verkoop in de app):
   - `status='verkocht_b2c'`, `customer_id`, `sold_by_user_id` en `sold_registered_by` = Hendrik, `sold_date=betaald_op`, `selling_price=auto.prijs`
   - `details`: dit wordt aangevuld, niet vervangen:
     - `sales_payment_status: 'aanbetaling'`
     - `salespersonId` en `salespersonName` = Hendrik
     - `websiteReservering: { betalingId, bedrag, betaaldOp, gereserveerdTot, advertentienummer, hexonNr, ophalen, financiering, bezorgen, autoUrl, bron }`
   - Het bedrag en de betaalreferentie staan daarmee in het voertuig (`details.websiteReservering`). Ze staan ook in het nieuwe logboek. Het label in het voertuigdetail is optioneel en hoort niet bij deze stap.
   - `transportStatus` en `location` worden niet aangeraakt. De app zet die bij verkopen wel op 'aangekomen', maar dat is fysieke status die we niet weten.
8. **Audit:** de bestaande trigger `vehicle_status_change_logger` schrijft de statuswijziging al zelf weg, met `changed_by = null` omdat het via de service-rol gaat. Direct daarna vult de functie die nieuwste rij aan:
   - `changed_by` = Hendrik
   - `change_metadata` wordt aangevuld met `{source:'website', betaling_id}`

   Er komt dus geen tweede auditregel en de trigger blijft ongewijzigd.
9. De weekverkopen worden niet bijgewerkt. Er wordt ook geen contract gemaakt; dat gebeurt in de showroom. Moet de verkoop wel in de wekelijkse ranglijst meetellen, dan gaat dat later via `update_weekly_sales`.
10. Elke uitkomst wordt vastgelegd in het logboek: ok, herhaald, 400, 401, 404, 409 of 500.

Antwoorden: `200 {ok:true, vehicle_id, contact_id}`, `401`, `400 {fout}`, `404 {fout:'auto_niet_gevonden'}`, `409 {fout:'meerdere_matches'|'al_verkocht'|'vin_kenteken_conflict'}`, `500`.

## Migratie-SQL
```sql
CREATE TABLE public.website_reservering_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  betaling_id text,
  resultaat text NOT NULL,          -- ok | herhaald | unauthorized | invalid | niet_gevonden | meerdere_matches | al_verkocht | fout
  http_status integer NOT NULL,
  vehicle_id uuid,
  contact_id uuid,
  fout text,
  payload jsonb,                    -- body zonder secret
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX website_reservering_log_ok_uniek
  ON public.website_reservering_log (betaling_id) WHERE resultaat = 'ok';
CREATE INDEX website_reservering_log_betaling_idx ON public.website_reservering_log (betaling_id);

GRANT SELECT ON public.website_reservering_log TO authenticated;
GRANT ALL ON public.website_reservering_log TO service_role;
ALTER TABLE public.website_reservering_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Beheer leest website-reserveringen" ON public.website_reservering_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));

INSERT INTO public.system_config (key, value)
VALUES ('website_reservering_verkoper_email', 'hendrik@auto-city.nl')
ON CONFLICT (key) DO NOTHING;
```
(Vóór het uitvoeren controleer ik de kolomnamen van `system_config`, en hoe de bestaande `validate_sold_vehicle_pricing`-trigger op `verkocht_b2c` reageert.)

## Bestanden
- Nieuw: `supabase/functions/website-reservering/index.ts`
- `supabase/config.toml`: één blok `[functions.website-reservering] verify_jwt = false` erbij
- Nieuw secret `RESERVERING_SECRET`: jij maakt een sterke waarde aan en zet die zowel op de website als in de Supabase-secrets. Het moet een gedeeld secret zijn, dus ik genereer het niet zelf.
- AGENTS.md: één regel over deze route

## Testen
Alles wordt getest met een tijdelijk testvoertuig (uniek kenteken) en een testcontact, en daarna opgeruimd met SQL-bevestiging en checksums. Geen echte auto's.
- 401 bij een fout secret
- 404 bij een onbekend kenteken
- 409 bij twee testauto's met hetzelfde kenteken
- ok-pad: status, contact, details, audit en log kloppen
- tweede aanroep met dezelfde betaling_id: herhaald, auto ongewijzigd

Niet publiceren.

## Functie-URL
`https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/website-reservering`
