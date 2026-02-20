

# Fix: Klant koppelen aan voertuig wordt niet opgeslagen

## Probleem

Wanneer je een klant selecteert in de Contacten-tab van een voertuig, verschijnt de toast "Klant succesvol gekoppeld aan voertuig" -- maar de koppeling wordt **niet** naar de database gestuurd. Het wordt alleen in de lokale state opgeslagen. Als je het dialoog sluit zonder op "Opslaan" te klikken, is de koppeling weg.

## Oorzaak

In `VehicleDetails.tsx` wordt de `ContactsTab` aangeroepen met `onUpdate={setEditedVehicle}` -- dit update alleen de lokale React-state. Er is geen auto-save gekoppeld, in tegenstelling tot de ChecklistTab die wel `onAutoSave` gebruikt om direct naar de database te schrijven.

## Oplossing

De `ContactsTab` uitbreiden met een `onAutoSave` prop, zodat klant- en leverancier-koppelingen direct worden opgeslagen in de database (net als de Checklist-tab al doet).

### Wijzigingen

**1. `src/components/inventory/detail-tabs/ContactsTab.tsx`**
- Nieuwe prop `onAutoSave?: (vehicle: Vehicle) => void` toevoegen
- Bij `handleCustomerChange`: na lokale state update, ook `onAutoSave` aanroepen zodat het direct naar de database gaat
- Bij `handleSupplierChange`: idem
- Bij "Wijzigen" knoppen (ontkoppelen): idem
- Toast tekst alleen tonen na succesvolle save

**2. `src/components/inventory/VehicleDetails.tsx`**
- `onAutoSave` doorgeven aan de `ContactsTab`, net zoals bij ChecklistTab:
  ```
  <ContactsTab 
    vehicle={editedVehicle}
    onUpdate={setEditedVehicle}
    onAutoSave={(updatedVehicle) => {
      setEditedVehicle(updatedVehicle);
      onAutoSave?.(updatedVehicle) || onUpdate(updatedVehicle);
    }}
  />
  ```

### Technisch detail

De flow wordt:

```text
Gebruiker selecteert klant
  -> handleCustomerChange()
    -> onUpdate() = lokale state bijwerken (voor UI)
    -> onAutoSave() = direct opslaan naar database
      -> supabaseInventoryService.updateVehicle() 
        -> UPDATE vehicles SET customer_id = '...' WHERE id = '...'
```

Dit is exact hetzelfde patroon als de ChecklistTab al gebruikt voor directe database-opslag.

