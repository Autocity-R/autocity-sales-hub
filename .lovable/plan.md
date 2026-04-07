

## Fix: Daan B2B Analyse — Verkeerd API endpoint

### Het probleem (100% bewezen uit logs)

De functie gebruikt `GET /api/cars/list` — dit is het **eigen voorraad window** van Auto City. Daarom retourneert ELKE query dezelfde eerste listing: `G-217-NH` uit Schiedam (Auto City zelf). Het maakt niet uit of je zoekt op Audi, Ford of Kia — je krijgt altijd je eigen auto's terug.

Dit endpoint is **niet** bedoeld om de markt te doorzoeken. Het toont alleen wat JP Cars over jouw eigen voorraad weet. Daarom:
- Dealer naam = alleen `location_name` (stadsnaam), geen echte dealer naam
- Geen `sold_since` data (het zijn jouw eigen auto's, niet verkochte auto's van anderen)
- Alle resultaten identiek ongeacht merk/model

### De oplossing

Gebruik `POST /api/valuate/extended` — hetzelfde endpoint dat jullie taxatie-systeem (`jpcars-lookup`) en dealer-lookup (`jpcars-dealer-lookup`) al succesvol gebruiken. Dit endpoint:
- Retourneert een `window[]` array met vergelijkbare auto's van ANDERE dealers
- Bevat `dealer_name` (echte dealer naam, bijv. "frankoomenautos.nl")
- Bevat `sold_since` (dagen sinds verkoop, null = nog te koop)
- Bevat `price_local`, `stock_days`, `license_plate`
- Filtert op merk, model, bouwjaar, brandstof, transmissie, kilometerstand

### Het nieuwe proces (per auto)

```text
1. Claude herkent: "Range Rover Evoque PHEV 2024 12530km"
   → brand: Land Rover, model: Range Rover Evoque
   → brandstof: Hybride, transmissie: Automaat, bouwjaar: 2024

2. POST /api/valuate/extended met:
   { make: "LAND ROVER", model: "RANGE ROVER EVOQUE",
     fuel: "Hybrid", gear: "Automatic", build: 2024, mileage: 12530 }

3. Response window[] bevat vergelijkbare auto's met:
   - dealer_name, price_local, sold_since, stock_days

4. Filter: sold_since != null (verkocht) en sold_since <= 40 (recent)
   Bereken: dealerPrijs - 3000 = B2B aanbod
   Check: aanbod - inkoopprijs >= 3000 = KANS
```

### Technische wijzigingen — `supabase/functions/daan-b2b-analyse/index.ts`

**1. Vervang `queryJPCars` functie volledig**
Van: `GET /api/cars/list?make=X&model=Y` (eigen voorraad)
Naar: `POST /api/valuate/extended` (markt taxatie met window)

De POST body gebruikt dezelfde mapping als `jpcars-lookup`:
- `make` / `model` in UPPERCASE
- `fuel`: Benzine→"Petrol", Diesel→"Diesel", Hybride→"Hybrid", Elektrisch→"Electric"
- `gear`: Automaat→"Automatic", Handgeschakeld→"Manual"
- `build`: bouwjaar als nummer
- `mileage`: kilometerstand

Response: `data.window` is de array met vergelijkbare listings.

**2. Pas `calculateB2BKansen` aan voor window data**
De window data heeft:
- `dealer_name` (echte dealer naam) — niet `location_name`
- `sold_since` (number, dagen) — null = nog te koop
- `stock_days` of `days_in_stock` — stagedagen
- `price_local` — prijs

Verwijder de `ownPlates` kenteken-filtering (niet nodig, valuate endpoint geeft al andere dealers).

**3. Filter alleen transportlijst auto's**
Huidige filter pakt alle offline auto's (53 stuks). Voor de B2B analyse willen we alleen auto's die nog onderweg zijn:
```
if (d.transportStatus !== "onderweg") return false;
```
Dit geeft ~47 auto's — precies de transportlijst.

**4. Fuel/Gear mapping functies toevoegen**
Kopieer de bewezen mapping uit `jpcars-lookup`:
```
mapFuel: Benzine→"Petrol", Diesel→"Diesel", Hybride→"Hybrid", Elektrisch→"Electric"
mapGear: Automaat→"Automatic", Handgeschakeld→"Manual"
```

**5. Excel output: meerdere kansen per auto behouden**
Nu wordt per auto alleen de beste kans bewaard (dedup op kenteken). Maar import auto's hebben vaak geen kenteken. Dedup op vehicle ID, en bewaar top 3 kansen per auto zodat verkopers meerdere dealers kunnen benaderen.

### Wat NIET verandert
- Claude batch parse (werkt al goed met notes/mileage)
- Excel styling en format
- Email verzending
- Rate limiting (200ms)
- Upload naar daan-analyses bucket

### Bestand

| Bestand | Actie |
|---------|-------|
| `supabase/functions/daan-b2b-analyse/index.ts` | Vervang queryJPCars + filter + veldnamen |

