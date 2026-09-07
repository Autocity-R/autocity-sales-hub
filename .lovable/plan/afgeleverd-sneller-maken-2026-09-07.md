# Afgeleverd sneller maken

## Wat er nu gebeurt

De pagina "Afgeleverd" haalt in één keer alle 1.015 afgeleverde auto's op, met alle velden erbij (ruim 1,6 MB aan gegevens), doet daarna nog extra opvragingen voor klant-, leverancier- en vervoerdersnamen, en zet vervolgens alle 1.015 regels tegelijk op het scherm — elke regel met een eigen inkoper-keuzelijst. Zoeken, filteren en sorteren gebeurt allemaal pas ná dat volledige ophalen. Vandaar de lange wachttijd.

## Wat we gaan doen

1. **Per pagina laden.** Standaard 50 auto's per pagina met "vorige / volgende" en een teller ("1–50 van 1.015"). De vorige pagina blijft zichtbaar tijdens het laden, dus geen leeg scherm.
2. **Alleen de gegevens die de lijst nodig heeft** ophalen in plaats van alles, en de klantnaam in dezelfde opvraging meenemen in plaats van in losse extra opvragingen.
3. **Zoeken, filteren, sorteren aan de databasekant.** Zoeken op kenteken, merk, model en klant gebeurt in de database over de héle lijst (niet alleen de zichtbare pagina), met een korte vertraging bij het typen zodat er niet bij elke toetsaanslag opnieuw gezocht wordt. Filters op klanttype en afleverperiode en het sorteren gaan mee in dezelfde opvraging.
4. **Lichtere regels.** De inkoper-keuzelijst wordt pas opgebouwd op het moment dat iemand erop klikt, in plaats van voor elke regel meteen.
5. **Index in de database** op status + afleverdatum, zodat het ophalen en sorteren van deze lijst snel blijft als de aantallen verder groeien.
6. **"Alles selecteren"** blijft werken op de zichtbare pagina; bij een branche-verplaatsing van een selectie verandert niets aan het gedrag.

Verwachte winst: eerste weergave van seconden naar vrijwel direct, en zoeken vindt vanaf nu ook auto's buiten de eerste pagina.

## Technische uitwerking

- `src/services/inventoryService.ts` / `supabaseInventoryService.ts`: nieuwe `fetchDeliveredVehiclesPage({ page, pageSize, search, salesType, dateFrom, dateTo, branch, sortField, sortDirection })`. Expliciete kolomlijst (`id, brand, model, year, mileage, license_number, vin, selling_price, status, branch, delivery_date, import_status, customer_id, purchased_by_user_id, purchased_by_name, details`) plus embed `contacts!vehicles_customer_id_fkey(company_name, first_name, last_name, email, phone)`; `.eq('status','afgeleverd')`, `vehicleScope`-filter, `.range()` en `{ count: 'exact' }`. Zoekterm via `.or(...ilike...)` op kenteken/merk/model/VIN; datumfilter op `delivery_date`; sorteren op whitelist van echte kolommen (default `delivery_date desc`). Geen `loadVehicleRelationships` meer op dit pad. Selectstring als `string` typen om trage typecheck te voorkomen.
- `src/pages/InventoryDelivered.tsx`: React Query met querykey inclusief alle filters, `placeholderData: keepPreviousData`, `staleTime` ~2 min; client-side filter/sort-blok vervalt; `useDebounce` op de zoekterm; paginatiebalk onder de tabel.
- `src/components/inventory/PurchaserQuickEdit.tsx`: `useSalespeople()` alleen aanroepen wanneer `isEditing` waar is (`enabled`-vlag), en de `SelectContent` lazy renderen.
- Migratie: `create index if not exists idx_vehicles_status_delivery_date on public.vehicles (status, delivery_date desc);` plus trigram/`lower()`-index alleen als de zoekopdracht meetbaar traag blijft.
- Controle achteraf met Playwright op desktop en 390px: laadtijd, zoeken op een auto van pagina 5, filters, sorteren, paginatie.
