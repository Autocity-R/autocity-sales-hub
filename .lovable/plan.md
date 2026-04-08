

## Plan: Leenauto workflow — twee-staps systeem

### Samenvatting
Verander de leenauto-toewijzing van "direct koppelen bij claim aanmaken" naar een twee-staps systeem: (1) markeer dat klant leenauto nodig heeft, (2) koppel later een specifieke leenauto als die beschikbaar is. Plus een leenauto-overzicht in het Sara Dashboard.

### Wijzigingen

**1. WarrantyForm.tsx — Vereenvoudig leenauto sectie (regel 574-612)**

Verwijder de leenauto-selectie dropdown. Behoud alleen de checkbox/switch "Klant heeft leenauto nodig". Bij aanmaken wordt alleen `loan_car_assigned = true` gezet, `loan_car_id` blijft NULL.

Huidige code (verwijderen):
- De `selectedLoanCar` state en de `Select` dropdown voor leenauto keuze
- De `availableLoanCars` filter
- De `loanCarId` en `loanCarDetails` in claimData

Nieuwe tekst bij de switch: "Klant heeft leenauto nodig" (i.p.v. "Leenauto toewijzen").

**2. SaraDashboard.tsx — Uitbreiden met leenauto workflow**

Pas de query aan om `loan_car_assigned`, `loan_car_id` en vehicle join op te halen voor alle open claims.

**Nieuwe KPI tegel**: "Leenauto's: X/Y in gebruik" — query alle vehicles met `details->>'isLoanCar' = 'true'`, tel hoeveel gekoppeld zijn aan actieve claims.

**Leenauto status per claim in de claims >14 dagen lijst** en een nieuw blok:

- Claims met `loan_car_assigned = true AND loan_car_id IS NULL` → 🟡 badge "Nodig" + knop "Koppel auto"
- Claims met `loan_car_assigned = true AND loan_car_id IS NOT NULL` → 🟢 badge met auto info

**"Koppel auto" actie**: Dialog/popover met dropdown van beschikbare leenauto's. Beschikbaar = vehicles met `isLoanCar = true` die NIET als `loan_car_id` in een actieve claim staan. Na selectie: `updateWarrantyClaim(claimId, { loanCarId: selectedVehicleId })`.

**"Loskoppelen" actie**: Bij gekoppelde leenauto's een knop om `loan_car_id` terug op NULL te zetten.

**3. SaraDashboard.tsx — Nieuw blok "Leenauto's in gebruik"**

Tabel met: leenauto (merk model), kenteken, bij klant, claim beschrijving, dagen in gebruik. Query: join `warranty_claims` met `vehicles` op `loan_car_id` waar `claim_status = 'pending'`.

**4. warrantyService.ts — Geen wijzigingen nodig**

`updateWarrantyClaim` ondersteunt al `loanCarId` updates (regel 216). De loan car status tracking (regels 220+) werkt al.

### Wat NIET verandert
- Database schema — `loan_car_id` en `loan_car_assigned` bestaan al
- warrantyService.ts — bestaande update logica werkt
- Loan car management pagina (LoanCars.tsx)
- Sara AI tools in hendrik-ai-chat

### Technisch overzicht

| Bestand | Actie |
|---------|-------|
| `src/components/warranty/WarrantyForm.tsx` | Verwijder leenauto dropdown, behoud alleen checkbox |
| `src/components/ai-agents/dashboards/SaraDashboard.tsx` | KPI tegel + leenauto status per claim + koppel/loskoppel knoppen + overzicht in gebruik |

