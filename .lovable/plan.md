## Oorzaak

Storage-bucket `vehicle-documents` staat op **private** (correct — koopcontracten bevatten klantgegevens). Maar in `src/services/contractStorageService.ts` worden de PDF-URLs gegenereerd via:

```ts
supabase.storage.from('vehicle-documents').getPublicUrl(filePath)
```

`getPublicUrl` produceert *altijd* een URL, ook voor private buckets — maar die URL geeft `400 Bad Request` / `Unauthorized` zonder een access-token. De iframe in `ContractViewer` (`src={contract.url}`) toont dan een lege/foutpagina, wat de gebruiker ervaart als "error bij Toon contract".

Hetzelfde geldt voor de Download- en Print-knoppen in `ContractViewer`: ze openen `contract.url` in een nieuw tabblad → ook leeg.

Dit speelt op drie plekken in `contractStorageService.ts`:
- `saveContractToVehicle` (regel ~55) — `publicUrl` opgeslagen in DB
- `getLatestContractForVehicle` (regel ~140) — `publicUrl` bij ophalen
- `getAllContractsForVehicle` (regel ~180) — idem

## Fix

Vervang `getPublicUrl` door **`createSignedUrl(filePath, 3600)`** (1 uur geldig — ruim voldoende voor bekijken/downloaden). Bucket blijft privé.

### Wijzigingen — alleen frontend, geen DB

1. **`src/services/contractStorageService.ts`**
   - `getLatestContractForVehicle`: vervang `getPublicUrl` door `await supabase.storage.from('vehicle-documents').createSignedUrl(data.file_path, 3600)`. Gebruik `signedUrl` voor zowel `url` als `fileUrl`.
   - `getAllContractsForVehicle`: zelfde aanpassing, maar in een `Promise.all` zodat we niet sequentieel signen per record.
   - `saveContractToVehicle`: idem voor de teruggegeven `VehicleFile`. We blijven `file_path` in de DB opslaan (niet de URL) — dat doen we al. De `file_url` kolom kan blijven leeg of we vullen 'm met een fresh signed URL bij elke read.

2. **`src/components/contracts/ContractViewer.tsx`** — geen wijziging nodig; werkt automatisch zodra `contract.url` een geldige signed URL is.

3. **`src/components/inventory/DeliveredVehicleDetails.tsx`** — geen wijziging; gebruikt `contract.url` indirect via `ContractViewer`.

### Verificatie

Na deploy: open Inventory → Afgeleverd → kies voertuig → "Bekijk Contract". Iframe moet de PDF tonen. Download/Print openen nu wel de PDF in nieuw tabblad.

## Niet in scope

- DB-migratie (de bucket blijft terecht privé).
- Wijzigen van bestaande `file_url` waarden in `vehicle_files` — signed URLs verlopen toch, dus we genereren ze altijd on-the-fly bij het lezen.
- Andere bestandscategorieën (transport-documenten, intake-frames) — alleen als gebruiker daar ook problemen meldt.
