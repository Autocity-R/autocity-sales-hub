# Diagnose: QR-checklist, Afleveringen, Voortgang, rechten directeur

Nog niets gewijzigd. Hieronder staan de bevindingen en daarna de voorgestelde oplossing.

## 1. QR-codes geven een fout

- **Aanmaak:** `ChecklistQRDialog.tsx:64-65` roept `buildChecklistUrl()` aan (`checklistAccessService.ts:79-81`).
- **Adres in de QR:** `{window.location.origin}/checklist/view/{token}` (token van 24 tekens uit `checklist_access_tokens`). Het domein is dus het adres waar iemand op dat moment printte. Een QR die vanuit de preview is geprint, wijst naar de preview.
- **Route:** bestaat nog precies zo, `App.tsx:92`: `/checklist/view/:token` staat openbaar, zonder ProtectedRoute of rolcontrole. Er wordt dus niet naar /auth gestuurd, en er is ook geen terugkeer na inloggen.
- **Oorzaak (bevestigd in de database):**
  - Het token opzoeken lukt nog, want de policy "Public can validate tokens" staat op `true`.
  - Daarna leest `getVehicleByToken` de tabel `vehicles`. De SELECT-policy **"Branch-scoped view vehicles"** vereist nu `auth.uid() IS NOT NULL`. Bij `verkocht_b2c` eist hij bovendien dezelfde vestiging als de gebruiker (of admin/owner, of vestiging leeg). Dit kwam mee met de invoering van meerdere vestigingen.
  - Wie de QR met de telefoon scant zonder in te loggen, krijgt 0 rijen en ziet **"Voertuig niet gevonden"**.
  - Wie wel is ingelogd maar bij een andere vestiging hoort, krijgt dezelfde fout.
  - Het afvinken zou daarna ook mislukken: de UPDATE-policy op `vehicles` staat alleen admin/owner/manager/verkoper toe, en anoniem al helemaal niet.
- **Playwright-reproductie:** nog niet gedraaid. Dat is de eerste stap van de uitvoering, als monteur.test en chef.test, zonder iets te wijzigen.

**Voorstel:**
- Twee `SECURITY DEFINER`-functies, `get_checklist_by_token(token)` en `toggle_checklist_item_by_token(token, item_id)`. Deze controleren het token en de status `verkocht_b2c`, en geven alleen merk, model, kenteken en checklist terug.
- `ChecklistView` gaat die functies gebruiken, zonder RLS te versoepelen.
- Nieuwe QR's gebruiken voortaan altijd het productiedomein `https://autocity-crm.nl` in plaats van `window.location.origin`. Oude tokens blijven gewoon werken.

## 2. Afleveringen / "Op deadline" (poetsmenu)

- **Bron:** `WerkplaatsPoetsen.tsx:184-190`. Hier telt alleen `work_orders.poets_type === "aflevering"`. De afspraken (`appointments`) en de checklist spelen geen rol.
- Het label "Aflevering za 03-10 10:00" komt uit een aparte bron: `useDeliveryMoments` in `deliveryAppointment.ts`, dat de afspraak ophaalt.
- **Tesla KTH-91-J (Model 3 RWD, verkocht_b2c, Rotterdam):**
  - Heeft een afleverafspraak op 03-10 08:00 UTC, dat is 10:00 NL-tijd.
  - Heeft maar één poetsopdracht: `poets_type = showroom`, status ingepland, `due_date` leeg.
  - Daarom staat hij in "Showroom" met het afleverlabel, en niet in "Afleveringen".
- **Voorstel:** een opdracht telt als aflevering als `poets_type = aflevering` **of** als er een geplande afleverafspraak bestaat. De deadline komt dan uit de afspraak wanneer `due_date` leeg is. Er wordt niets in de database geschreven.

## 3. Verkocht B2C, sortering "Voortgang"

- De kolomkop (`VehicleB2CTableHeader.tsx:97`) zet `sortField = "checklistProgress"` via `useB2CVehicleHandlers.ts:187`.
- **Die waarde wordt nergens op de rijen toegepast.** `InventoryB2C.tsx` en `VehicleB2CTable.tsx` geven hem alleen door aan de kop, voor het pijltje. Klikken verandert de volgorde dus niet.
- Het percentage wordt dubbel berekend, in `InventoryB2C.tsx:88` en in `VehicleB2CTableRow.tsx:70`. Beide rekenen: afgevinkt gedeeld door totaal in `details.preDeliveryChecklist`.
- **Voorstel:** één gedeelde functie `getChecklistProgress` maken en de rijen in `InventoryB2C` echt sorteren op de gekozen kolom.

## 4. Rechten: aftersales_manager mag het wel, operationeel_directeur niet

**(a) Taken toewijzen vanuit de aflever-checklist**
- Scherm: `ChecklistTab.tsx:41-42` gebruikt `canManageChecklists()`. Samen met `canAssignTasks()` in `useRoleAccess.ts` laat dat de directeur buiten.
- Database: taken aanmaken kan wel (`assigned_by = auth.uid()`). Bij het bijwerken van taken staat de directeur **niet** in de lijst met rollen.

**(b) Planning bewerken en omhoog/omlaag schuiven**
- Scherm: `WerkplaatsPlanning.tsx:333-336` gebruikt `canPlanWorkOrders()`. Die staat de directeur al toe.
- Database: policy `wo_update_directeur` staat de directeur ook toe.
- Hier zit dus geen blokkade, behalve verwijderen. Het `readOnly = isDirectieReadOnly()` op dezelfde plek controleer ik per knop.

**(c) Uitdeuken bewerken en ▲/▼-prioriteit**
- Scherm: `WerkplaatsUitdeuken.tsx:40-42` zet `readOnly = isDirectieReadOnly()` en verbergt daarmee alle bewerkknoppen voor de directeur.
- Database: werkorders bijwerken mag hij wel, via `wo_update_directeur`. Alleen het scherm blokkeert hem.

**Voorstel (als je wilt dat hij het kan):**
- `canManageChecklists` en `canAssignTasks` uitbreiden met `operationeel_directeur`.
- De directeur toevoegen aan de UPDATE-policy op `tasks`.
- In Uitdeuken voor bewerken en prioriteit `canPlanWorkOrders()` gebruiken in plaats van `readOnly`.

## Volgorde van uitvoering

1. Playwright-reproductie van de QR-fout, zonder inlog en als monteur en chef.
2. QR-fix (functies plus ChecklistView plus vast domein). Dit heeft de hoogste prioriteit.
3. Afleveringen afleiden uit de afspraak.
4. Voortgang-sortering echt laten werken.
5. Rechten voor de directeur (alleen na jouw akkoord op 4).
6. Typecheck en build. Niet publiceren.
