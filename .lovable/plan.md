# Koopcontract opslaan zonder digitale ondertekening

Doel: een koopcontract kunnen opmaken en als PDF vastleggen bij de auto, ook als de klant niet digitaal tekent. Daarna zelf kiezen om het naar de administratie te sturen, en de PDF automatisch kunnen meesturen bij een factuuraanvraag of andere e-mail.

## Wat er komt

### 1. Knop "Contract opslaan als PDF" (contract-opmaakpagina)
- Naast "Concept opslaan" en "Versturen voor ondertekening" komt een derde knop: **Opslaan als PDF (zonder ondertekening)**.
- De PDF wordt exact zoals de preview gegenereerd, met de verkopers-signatuur ingevuld en een **lege klantsignatuur-lijn** (klant tekent op papier).
- De PDF wordt opgeslagen bij de auto en verschijnt direct in de documentenlijst van het voertuig (categorie koopcontract B2B/B2C), net als een getekend contract.
- Statuslabel op het contract wordt "opgeslagen (niet digitaal getekend)", zodat het duidelijk verschilt van "getekend".
- Opnieuw opslaan overschrijft de eerdere PDF van hetzelfde contractnummer (geen dubbele documenten).

### 2. Aparte knop "Naar administratie sturen"
- Verschijnt zodra de PDF is opgeslagen (zowel op de contractpagina als bij het contract in de voertuigdocumenten).
- Verstuurt een e-mail naar administratie@auto-city.nl met de contract-PDF als bijlage en dezelfde professionele opmaak/gegevensblok als de bestaande administratie-mail bij getekende contracten (auto, klant, prijs, aanbetaling, garantie, inruil, financiering, verkoper).
- De mail wordt nooit automatisch verstuurd; wordt gelogd zodat je ziet of/wanneer het al gebeurd is, met een duidelijke waarschuwing bij nogmaals versturen.

### 3. Contract meesturen met een e-mail
- **Factuuraanvraag:** in de dialoog "Factuur aanvragen" komt een vinkje **"Koopcontract meesturen"** (standaard aan als er een contract-PDF is). De bestaande waarschuwing "geen koopcontract gevonden" blijft staan als er niets is.
- **Voertuigdocumenten:** bij elk contract in de documentenlijst een knop **"Meesturen per e-mail"** waarmee je het contract als bijlage naar een zelf ingevuld e-mailadres stuurt (standaard het klantadres).

## Technisch

- **Nieuwe edge function `contract-store`**: ontvangt `contractId` + `pdf_base64`, valideert de JWT en rechten, uploadt naar bucket `vehicle-documents` op pad `<vehicle_id>/contracts/<contractnummer>.pdf` (upsert), registreert/actualiseert de rij in `vehicle_files` (categorie `contract_b2b`/`contract_b2c`, metadata `signed: false`, `source: contract_v2_manual`) en zet `contract_documents.status = 'opgeslagen'` met `pdf_path`/`stored_at`.
- **Nieuwe edge function `contract-to-administration`**: ontvangt `contractId`, haalt de opgeslagen PDF op, plaatst één rij in `email_queue` (`to` als array van strings, base64-bijlage) met template `contract_v2_stored_administratie`, en zet `administratie_notified_at`.
- **Migratie**: kolommen `pdf_path`, `stored_at`, `stored_by` op `contract_documents` (status-waarde `opgeslagen` toegestaan); geen nieuwe tabellen.
- **`ContractDocumentV2.tsx`**: prop `signatureMode: 'digital' | 'manual'` — bij `manual` blijft het klantsignatuur-vak leeg met lijn en tekst "Handtekening koper".
- **`ContractNew.tsx`**: nieuwe handler die de preview via de bestaande `generatePdfFromHtml`-flow naar base64 omzet en `contract-store` aanroept; knoppen + statusweergave uitgebreid.
- **`contractV2Service.ts`**: `storeContractPdfV2()` en `sendContractToAdministration()`.
- **`VehicleContractStatusList.tsx`**: extra statuschip "Opgeslagen" en de twee nieuwe acties.
- **`emailTemplateService.ts`**: `latest-contract`-bijlage respecteert de nieuwe keuzevlag; `InvoiceRequestDialog` geeft `includeContract` mee via de bestaande `onConfirm`-flow in `InventoryB2C.tsx`/`InventoryB2B.tsx`.
- Verkoopflows, garantie-regels en de digitale ondertekenflow blijven onaangeraakt; niets wordt gepubliceerd.
