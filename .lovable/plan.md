
# Plan: Dynamische Taak-Koppeling in Checklist

## Probleem

Wanneer een taak wordt verwijderd die gekoppeld is aan een checklist item, blijft de `linkedTaskId` in het checklist item staan. Hierdoor:
- Toont het item nog steeds de "Taak toegewezen" badge
- Kan er geen nieuwe taak worden toegewezen (de knop is verborgen)
- De koppeling is "verweesd" - de taak bestaat niet meer

## Oplossing

Een tweevoudige aanpak voor maximale betrouwbaarheid:

### Deel 1: Cleanup bij Taak Verwijdering

Wanneer een taak wordt verwijderd, automatisch de `linkedTaskId` verwijderen uit het gekoppelde checklist item.

**Bestand:** `src/services/taskService.ts`

Wijziging in `deleteTask` functie:
1. Ophalen van de taak voordat deze wordt verwijderd
2. Controleren of er een `linked_checklist_item_id` en `linked_vehicle_id` is
3. Zo ja: het voertuig ophalen en de `linkedTaskId` uit het checklist item verwijderen
4. Daarna de taak verwijderen

### Deel 2: Real-time Validatie (Fallback)

Als extra veiligheid: bij het laden van de ChecklistTab, valideren of gekoppelde taken nog bestaan. Dit vangt situaties op waarin de cleanup mislukt of taken via andere wegen zijn verwijderd.

**Bestand:** `src/components/inventory/detail-tabs/ChecklistTab.tsx`

Wijzigingen:
1. Query toevoegen om bestaande taak-IDs te valideren
2. Badge alleen tonen als de taak daadwerkelijk bestaat
3. "Taak toewijzen" knop tonen als de gekoppelde taak niet meer bestaat

## Technische Details

### taskService.ts Wijzigingen

```typescript
export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    // Eerst taakgegevens ophalen voor cleanup
    const { data: taskData } = await supabase
      .from('tasks')
      .select('linked_checklist_item_id, linked_vehicle_id')
      .eq('id', taskId)
      .single();

    // Cleanup: verwijder linkedTaskId uit checklist item
    if (taskData?.linked_checklist_item_id && taskData?.linked_vehicle_id) {
      await removeChecklistTaskLink(
        taskData.linked_vehicle_id, 
        taskData.linked_checklist_item_id
      );
    }

    // Daarna taak verwijderen
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  } catch (error: any) {
    console.error("Failed to delete task:", error);
    throw error;
  }
};

// Nieuwe helper functie
const removeChecklistTaskLink = async (
  vehicleId: string, 
  checklistItemId: string
): Promise<void> => {
  try {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('details')
      .eq('id', vehicleId)
      .single();

    if (!vehicle) return;

    const details = vehicle.details as any || {};
    const checklist = details.preDeliveryChecklist || [];

    const updatedChecklist = checklist.map((item: any) => {
      if (item.id === checklistItemId) {
        const { linkedTaskId, ...rest } = item;
        return rest; // Verwijder linkedTaskId
      }
      return item;
    });

    await supabase
      .from('vehicles')
      .update({ 
        details: { ...details, preDeliveryChecklist: updatedChecklist } 
      })
      .eq('id', vehicleId);

    console.log('[taskService] Removed checklist task link');
  } catch (error) {
    console.error('[taskService] Error removing checklist link:', error);
    // Niet gooien - we willen de taak verwijdering niet blokkeren
  }
};
```

### ChecklistTab.tsx Wijzigingen

```typescript
// Nieuwe imports
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// In de component: query voor taak validatie
const linkedTaskIds = checklist
  .filter(item => item.linkedTaskId)
  .map(item => item.linkedTaskId as string);

const { data: existingTaskIds = [] } = useQuery({
  queryKey: ['existing-tasks', linkedTaskIds],
  queryFn: async () => {
    if (linkedTaskIds.length === 0) return [];
    const { data } = await supabase
      .from('tasks')
      .select('id')
      .in('id', linkedTaskIds);
    return (data || []).map(t => t.id);
  },
  enabled: linkedTaskIds.length > 0,
  staleTime: 30000, // 30 seconden cache
});

// Helper functie
const taskExists = (taskId: string | undefined): boolean => {
  if (!taskId) return false;
  return existingTaskIds.includes(taskId);
};

// Badge conditie wijzigen (regel 253)
// Van:
{item.linkedTaskId && (
  <Badge>Taak toegewezen</Badge>
)}

// Naar:
{item.linkedTaskId && taskExists(item.linkedTaskId) && (
  <Badge>Taak toegewezen</Badge>
)}

// Knop conditie wijzigen (regel 277)
// Van:
{!readOnly && !item.completed && !item.linkedTaskId && (

// Naar:
{!readOnly && !item.completed && !taskExists(item.linkedTaskId) && (
```

## Bestandswijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/services/taskService.ts` | `deleteTask` uitbreiden met cleanup logica + nieuwe `removeChecklistTaskLink` helper |
| `src/components/inventory/detail-tabs/ChecklistTab.tsx` | Query voor taak validatie + dynamische badge/knop weergave |

## Verwacht Resultaat

Na implementatie:
1. Wanneer een taak wordt verwijderd, verdwijnt automatisch de "Taak toegewezen" badge
2. De "Taak toewijzen" knop verschijnt weer zodat een nieuwe taak kan worden toegewezen
3. Het werkt ook als taken via het TaskManagement scherm worden verwijderd
4. Bestaande "verweesde" koppelingen worden automatisch opgelost bij het openen van de checklist
