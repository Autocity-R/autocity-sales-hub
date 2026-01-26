
# Plan: Aftersales Dashboard Checklist Opslaan Fix

## Probleem Gevonden

Het Aftersales Dashboard mist de cruciale `onAutoSave` functie bij het openen van voertuig details. Hierdoor worden alle wijzigingen aan de checklist (items afvinken, taken koppelen, etc.) **NIET opgeslagen** naar de database.

### Wat er mis gaat:

```
Aftersales Dashboard → Bekijk (Kia e-Niro) → Checklist tab → Items wijzigen → [NIET OPGESLAGEN]
```

De `onAutoSave` prop die verantwoordelijk is voor het direct opslaan van checklist wijzigingen wordt niet doorgegeven aan de `VehicleDetails` component.

## Oplossing

### 1. Wijziging: `src/components/reports/AftersalesDashboard.tsx`

Voeg een `handleAutoSave` functie toe die voertuig wijzigingen opslaat naar Supabase en geef deze door aan VehicleDetails:

**Nieuwe functie toevoegen:**
```typescript
const handleAutoSaveVehicle = async (updatedVehicle: Vehicle) => {
  try {
    const { error } = await supabase
      .from('vehicles')
      .update({
        details: updatedVehicle.details,
        // Andere relevante velden
      })
      .eq('id', updatedVehicle.id);
    
    if (error) throw error;
    
    // Update lokale state
    vehicleDialog.updateVehicle(updatedVehicle);
    
    toast({ title: "Wijzigingen opgeslagen" });
  } catch (error) {
    toast({ 
      title: "Fout bij opslaan", 
      description: "Checklist wijzigingen konden niet worden opgeslagen.",
      variant: "destructive" 
    });
  }
};
```

**VehicleDetails aanroep wijzigen:**
```tsx
<VehicleDetails
  vehicle={vehicleDialog.vehicle}
  defaultTab={vehicleDialog.defaultTab}
  onClose={vehicleDialog.closeDialog}
  onUpdate={handleSaveVehicle}       // ← Echte save functie
  onAutoSave={handleAutoSaveVehicle} // ← NIEUWE: Auto-save voor checklist
  onSendEmail={() => {}}
  onPhotoUpload={() => {}}
  onRemovePhoto={() => {}}
  onSetMainPhoto={() => {}}
/>
```

### 2. Uitbreiding: `src/hooks/useVehicleDetailDialog.ts`

Voeg een `updateVehicle` functie toe om de lokale state bij te werken na een save:

```typescript
const updateVehicle = useCallback((updatedVehicle: Vehicle) => {
  setState(prev => ({
    ...prev,
    vehicle: updatedVehicle
  }));
}, []);

return {
  // ... bestaande returns
  updateVehicle,  // ← Nieuw
};
```

### 3. Toast Feedback Toevoegen

Import en gebruik toast voor feedback bij opslaan/falen:

```typescript
import { useToast } from '@/hooks/use-toast';
// ...
const { toast } = useToast(); // Al aanwezig
```

## Technische Details

### Huidige Flow (KAPOT):
```
1. Open checklist in Aftersales Dashboard
2. Wijzig item (toggle, delete, add)
3. ChecklistTab roept onUpdate aan → editedVehicle wijzigt
4. onAutoSave is undefined → NIETS wordt opgeslagen
5. Dialog sluiten → Wijzigingen verloren
```

### Nieuwe Flow (GEREPAREERD):
```
1. Open checklist in Aftersales Dashboard
2. Wijzig item (toggle, delete, add)
3. ChecklistTab roept onUpdate aan → editedVehicle wijzigt
4. onAutoSave is gedefinieerd → Supabase update wordt uitgevoerd
5. Toast toont "Wijzigingen opgeslagen"
6. Dialog sluiten → Wijzigingen behouden
```

## Bestanden te Wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/reports/AftersalesDashboard.tsx` | Toevoegen `handleAutoSaveVehicle` functie + doorgeven aan VehicleDetails |
| `src/hooks/useVehicleDetailDialog.ts` | Toevoegen `updateVehicle` functie |

## Kia e-Niro Taken Status

Op basis van de database zie ik de volgende taken die nog gekoppeld zijn aan de Kia e-Niro (J-481-VK):

| Taak Beschrijving | Status | Gecreëerd |
|-------------------|--------|-----------|
| Achterklep hapert met openen | toegewezen | 23 jan |
| Indien iemand links achter zit, gaat midden piepen | toegewezen | 23 jan |
| Pitje rechterachter scherm uitdeuken | toegewezen | 23 jan |
| Plekjes bijwerken rondom GOED | toegewezen | 23 jan |

En de checklist heeft 9 items waarvan 2 voltooid (12v accu vervangen + Onderhoudsbeurt bij Kia Breda).

## Resultaat

Na deze fix:
- Alle checklist wijzigingen in Aftersales Dashboard worden direct opgeslagen
- Gebruikers krijgen visuele feedback (toast) wanneer wijzigingen zijn opgeslagen
- Taak-koppelingen blijven behouden
- Geen data verlies meer bij het sluiten van de dialog
