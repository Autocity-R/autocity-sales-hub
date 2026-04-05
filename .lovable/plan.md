

## Plan: Inruil auto's automatisch markeren als "Ingeschreven"

### Probleem
Inruil voertuigen zijn vrijwel altijd Nederlands geregistreerd en hoeven geen importproces te doorlopen. Momenteel krijgen ze `import_status = niet_gestart` of `niet_aangemeld`, waardoor ze onnodig in import-gerelateerde workflows verschijnen.

### Aanpak
Op **3 plekken** waar de isTradeIn-toggle wordt gezet of een inruil voertuig wordt aangemaakt, ook `import_status` automatisch op `ingeschreven` zetten:

1. **VehicleForm.tsx** (nieuw voertuig aanmaken)
   - Bij toggle `isTradeIn = true`: zet `importStatus: "ingeschreven"` naast de bestaande `transportStatus: "aangekomen"`
   - Bij toggle uit: reset naar `"niet_aangemeld"`

2. **DetailsTab.tsx** (bestaand voertuig bewerken)
   - Bij toggle `isTradeIn = true`: ook `importStatus` op `"ingeschreven"` zetten via `handleChange`

3. **supabaseInventoryService.ts** (create vehicle)
   - Als `details.isTradeIn === true` en geen expliciete importStatus: default naar `"ingeschreven"` i.p.v. `"niet_gestart"`

4. **MarcoDashboard.tsx** - Geen wijziging nodig, inruil auto's worden al uitgefilterd (`if (isTradeIn) return null`)

### Resultaat
Inruil auto's worden direct als "Ingeschreven" gemarkeerd, waardoor ze correct worden behandeld als Nederlandse voertuigen die geen import nodig hebben.

