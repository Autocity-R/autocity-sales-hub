
## Doel
De foutmelding bij Lloyd (aftersales_manager) weghalen én ervoor zorgen dat hij:
- checklist-items kan afvinken (en taken koppelen/toewijzen)
- taken kan maken/toewijzen/afvinken (dit hebben we al in de taken-UI gedaan)
Zonder dat hij “echte” voertuigdata (prijzen/status/klantkoppeling) kan bewerken.

## Wat er nu misgaat (oorzaak)
1) **De foutmelding komt door een voertuig-update die Lloyd niet mág doen (RLS)**
- In de console staat `PGRST116 ... result contains 0 rows ... JSON object requested...` bij `updateVehicle`.
- Dit gebeurt wanneer de app via `supabaseInventoryService.updateVehicle(...)` of een directe `vehicles.update(...)` probeert te schrijven.
- Voor `aftersales_manager` staat RLS op `vehicles` UPDATE **uit** (bewust), dus de update faalt → toast “Fout bij het bijwerken van het voertuig”.

2) **De UI behandelt aftersales_manager per ongeluk als “niet read-only” in VehicleDetails**
- `VehicleDetails.tsx` zet readOnly nu vooral op basis van `isOperationalUser()`.
- Aftersales_manager is geen “operationeel” user, dus krijgt hij per ongeluk bewerk-flow/auto-save → die probeert voertuigen te updaten → RLS error.

3) **Taak afronden kan ook checklist in vehicle.details willen updaten**
- `taskService.ts` heeft `autoCompleteChecklistItem(...)` dat `vehicles.details.preDeliveryChecklist` bijwerkt via `.from('vehicles').update(...)`.
- Ook dit faalt voor aftersales_manager met huidige RLS.

## Oplossing (veilig én passend bij roldefinitie)
We pakken dit in 2 lagen aan:

### A) Frontend: aftersales_manager “read-only vehicle”, maar wél checklist-toggle en taak-toewijzing
We passen `VehicleDetails` + `ChecklistTab` permissies aan zodat:
- Aftersales_manager kan **niet** opslaan/autosaven van het voertuig als geheel
- Aftersales_manager kan **wel** checklist items afvinken
- Aftersales_manager kan **wel** taken aan checklist-items koppelen/toewijzen (assign task knop zichtbaar)
- Daardoor stopt de app met het triggeren van `updateVehicle(...)` voor Lloyd → foutmelding weg

Concreet:
1. **`src/components/inventory/VehicleDetails.tsx`**
   - `useRoleAccess()` uitbreiden in deze component met `canEditVehicles`, `canChecklistToggle`, `canAssignTasks`.
   - Nieuwe permissie-logica:
     - `const canEditThisVehicle = canEditVehicles();`
     - `const canToggleChecklist = canChecklistToggle();`
     - `const isReadOnly = !canEditThisVehicle;`
     - `const canOnlyToggleChecklist = isReadOnly && canToggleChecklist;`
   - Save-knop en autosave blokkeren als `isReadOnly === true`.
   - ChecklistTab props:
     - `readOnly={isReadOnly && !canOnlyToggleChecklist}` (zoals nu idee)
     - `canToggleOnly={canOnlyToggleChecklist}`
     - extra prop toevoegen (nieuw): `canAssignTasks={canAssignTasks()}` zodat “Taak toewijzen” knop ook in toggle-only modus zichtbaar kan zijn.

2. **`src/components/inventory/detail-tabs/ChecklistTab.tsx`**
   - Nieuwe prop `canAssignTasks?: boolean`.
   - “Taak toewijzen” knop tonen op basis van:
     - `(!readOnly || canAssignTasks)` in plaats van alleen `!readOnly`
   - Toggle checkbox moet blijven werken wanneer `canToggleOnly` true is (nu werkt toggle al zolang `readOnly` false is). Dus we passen de checkbox rendering aan:
     - Als `readOnly === true` maar `canToggleOnly === true`: toon checkbox (en laat toggle toe).
     - Als `readOnly === true` en `canToggleOnly === false`: alleen icon (geen toggle).

Resultaat: Lloyd kan checklist afvinken + taken toewijzen, maar alle voertuig “Opslaan/autosave” flows worden geblokkeerd.

### B) Backend (Supabase): veilige “alleen checklist bijwerken” RPC voor auto-complete vanuit taken
Omdat `taskService.autoCompleteChecklistItem()` ook de checklist in `vehicles.details` wil updaten, maken we dit veilig via een **security definer function** (RPC) die:
- Alleen de checklist-item completion bijwerkt
- Alleen toegankelijk is voor toegestane rollen (admin/owner/manager/verkoper/aftersales_manager)
- Geen algemene vehicle update rechten hoeft te geven aan aftersales_manager

Concreet:
1. **Nieuwe Supabase migration** (nieuwe SQL file in `supabase/migrations/`)
   - Maak functie, bijv:
     - `public.complete_pre_delivery_checklist_item(vehicle_id uuid, checklist_item_id text, completed_by_name text)`
   - Implementatie:
     - Haal huidige `details->preDeliveryChecklist` op
     - Update alleen het juiste item (set completed/completedAt/completedByName)
     - Schrijf terug naar `vehicles.details`
   - Function:
     - `SECURITY DEFINER`
     - `set search_path = public`
     - Autorisatie-check in SQL:
       - `if not (has_role(auth.uid(),'admin') or ... or has_role(auth.uid(),'aftersales_manager')) then raise exception ...`
2. **`src/services/taskService.ts`**
   - Vervang het directe `supabase.from('vehicles').update(...)` in `autoCompleteChecklistItem` door:
     - `supabase.rpc('complete_pre_delivery_checklist_item', { vehicle_id: ..., checklist_item_id: ..., completed_by_name: ... })`
   - Foutafhandeling: nog steeds “niet throwen” (zodat taak voltooien nooit faalt door checklist-sync).

Resultaat: Ook wanneer Lloyd taken voltooit die aan checklist-items gekoppeld zijn, kan de checklist automatisch geüpdatet worden zonder vehicle UPDATE permissie.

## Waarom dit de foutmelding oplost
- De toast “Fout bij het bijwerken van het voertuig” kwam doordat de UI probeerde een vehicle update te doen die Lloyd niet mag.
- Door aftersales_manager als read-only op voertuigen te behandelen, verdwijnen die update calls.
- Waar we wél een write nodig hebben (checklist completion), doen we dat via een gecontroleerde RPC i.p.v. algemene UPDATE rechten.

## Testplan (wat jij/ Lloyd moet testen)
1) Inloggen als Lloyd → ga naar `/inventory/consumer` → open een B2C voertuig → Checklist tab:
   - Checklist item afvinken: mag, geen fouttoast.
   - Geen “Opslaan” button zichtbaar (of disabled), geen autosave-trigger.
2) In Checklist: “Taak toewijzen” op een item:
   - Taak aanmaken + toewijzen moet werken (en link badge “Taak toegewezen” zichtbaar).
3) In Takenbeheer: voltooi een taak die gekoppeld is aan een checklist item:
   - Taak status naar “voltooid” moet werken
   - Checklist item wordt automatisch op completed gezet (via RPC)
   - Geen “Fout bij het bijwerken van het voertuig” toast.

## Bestanden die aangepast worden
Frontend:
- `src/components/inventory/VehicleDetails.tsx`
- `src/components/inventory/detail-tabs/ChecklistTab.tsx`
- (mogelijk) types voor props aanpassen waar ChecklistTab gebruikt wordt

Backend:
- `supabase/migrations/<new>_checklist_rpc.sql` (nieuwe migration)
- `src/services/taskService.ts` (RPC call)

## Risico’s / aandachtspunten
- We moeten de checklist JSON-structuur consistent houden (id/description/completed/completedAt/completedByName). De RPC moet defensief omgaan met ontbrekende checklist arrays.
- PGRST116 blijft een “symptoom-code” bij `.single()` zonder rows; door de UI flow te stoppen voor Lloyd, hoort die niet meer op te treden in dit scenario.
