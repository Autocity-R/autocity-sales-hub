
# Plan: Aftersales Manager Volledige Functionaliteit

## Probleem Samenvatting

De Aftersales Manager (Lloyd) kan momenteel niet:
- Checklist items afvinken of toevoegen in voertuigen
- Taken toewijzen vanuit de checklist
- Taken voltooien in het takenschema
- Voertuig updates opslaan (database blokkeert dit)

## Oorzaken

### 1. Database RLS Policy - `vehicles` tabel
De UPDATE policy op de `vehicles` tabel mist de `aftersales_manager` rol:

```sql
-- Huidige policy (UPDATE):
has_role('admin') OR has_role('owner') OR has_role('manager') OR has_role('verkoper')
```

**Gevolg**: Elke update naar de `vehicles` tabel (inclusief checklist wijzigingen in het `details` JSONB veld) faalt met een RLS policy error.

### 2. Frontend logica - `VehicleDetails.tsx`
De frontend determineert nu alleen `operationeel` als speciale rol, maar de aftersales_manager wordt niet correct afgehandeld voor checklist editing:

```typescript
// Huidige logica (lijn 67-68):
const isReadOnly = isOperationalUser(); // FALSE voor aftersales_manager
const canOnlyToggleChecklist = isOperationalUser() && canChecklistToggle(); // FALSE
```

De aftersales_manager krijgt dus volledige UI rechten, maar de database blokkeert alles.

## Oplossing

### Database Migratie

Update de `vehicles` tabel UPDATE policy om `aftersales_manager` toe te voegen:

```sql
-- Drop oude policy
DROP POLICY IF EXISTS "Authorized users can update vehicles" ON vehicles;

-- Maak nieuwe policy met aftersales_manager
CREATE POLICY "Authorized users can update vehicles" 
ON vehicles FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role) OR
  has_role(auth.uid(), 'aftersales_manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role) OR
  has_role(auth.uid(), 'aftersales_manager'::app_role)
);
```

### Frontend Aanpassingen

#### 1. `src/hooks/useRoleAccess.ts`
Voeg een nieuwe functie toe voor checklist bewerking:

```typescript
// Aftersales manager MAG checklisten volledig bewerken (items toevoegen, afvinken, taken toewijzen)
const canManageChecklists = () => {
  return isAdmin || userRole === 'manager' || userRole === 'verkoper' || userRole === 'aftersales_manager';
};
```

#### 2. `src/components/inventory/VehicleDetails.tsx`
Update de role-based access logica:

```typescript
// Huidige code:
const { hasPriceAccess, isOperationalUser, canChecklistToggle } = useRoleAccess();
const isReadOnly = isOperationalUser();
const canOnlyToggleChecklist = isOperationalUser() && canChecklistToggle();

// Nieuwe code:
const { hasPriceAccess, isOperationalUser, canChecklistToggle, canEditVehicles, isAftersalesManager, canManageChecklists } = useRoleAccess();

// Voor algemene voertuig editing (details tab, prijzen, etc.)
const isReadOnly = isOperationalUser() || isAftersalesManager(); 

// Aftersales manager mag checklist volledig beheren (niet alleen toggle)
const canOnlyToggleChecklist = isOperationalUser() && canChecklistToggle();

// Aftersales manager krijgt volledige checklist toegang
const checklistReadOnly = !canManageChecklists();
const checklistCanToggleOnly = isOperationalUser() && canChecklistToggle();
```

Update ChecklistTab props:

```typescript
<ChecklistTab 
  vehicle={editedVehicle}
  onUpdate={(updatedVehicle) => {
    hasUserChangesRef.current = true;
    setEditedVehicle(updatedVehicle);
  }}
  onAutoSave={onAutoSave}
  readOnly={checklistReadOnly}
  canToggleOnly={checklistCanToggleOnly}
/>
```

## Bestandswijzigingen

| Bestand/Type | Actie |
|--------------|-------|
| Database: `vehicles` tabel | UPDATE RLS policy aanpassen |
| `src/hooks/useRoleAccess.ts` | Nieuwe `canManageChecklists()` functie toevoegen |
| `src/components/inventory/VehicleDetails.tsx` | Role-based logica updaten voor Aftersales Manager |

## Verwacht Resultaat

Na deze wijzigingen kan de Aftersales Manager:

| Functie | Was | Wordt |
|---------|-----|-------|
| Checklist items afvinken | Geblokkeerd (RLS) | Werkt |
| Checklist items toevoegen | Geblokkeerd (RLS) | Werkt |
| Taken toewijzen vanuit checklist | Geblokkeerd (RLS) | Werkt |
| Taken voltooien | Al werkend | Blijft werken |
| Voertuig details bewerken (prijzen, etc.) | Geblokkeerd | Blijft geblokkeerd (zoals gewenst) |

## Belangrijke Notities

- De aftersales_manager krijgt **GEEN** toegang tot prijzen of algemene voertuig details bewerken
- Alleen checklist en taak-gerelateerde functies worden ontgrendeld
- De RLS policy update is kritiek - zonder dit werkt niets
