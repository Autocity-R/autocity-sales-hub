

# Plan: Aftersales Manager Volledige Taakbeheer

## Samenvatting

De Aftersales Manager rol moet uitgebreide taakbeheer mogelijkheden krijgen:
- Alle taken van alle gebruikers kunnen zien
- Taken kunnen toewijzen aan andere medewerkers  
- Taken van anderen kunnen starten/voltooien
- Taken kunnen afvinken vanuit het Rapportages menu (Aftersales Dashboard)
- Taken kunnen toewijzen vanuit de "Bekijk" knop bij B2C leveringen

## Huidige Situatie

### Wat nu wel werkt:
- `aftersales_manager` heeft al SELECT/UPDATE rechten op de `tasks` tabel via RLS
- `useRoleAccess.ts` heeft `canAssignTasks()` en `hasTaskManagementAccess()` die `aftersales_manager` toestaan
- VehicleDetails > ChecklistTab laat `aftersales_manager` al taken toewijzen (`canManageChecklists()`)

### Wat nu niet werkt:

1. **Aftersales Dashboard mist taak acties**
   - De taken tabel in `AftersalesDashboard.tsx` toont taken read-only
   - Geen knoppen voor "Voltooid", "Start", of "Nieuwe Taak"
   - Geen actie kolom in de taak tabel

2. **RLS INSERT policy is te restrictief**
   ```sql
   -- Huidige policy
   WITH CHECK: (assigned_by = auth.uid())
   ```
   Dit betekent dat taken altijd `assigned_by` = huidige gebruiker moeten hebben. Dit werkt voor nieuwe taken, maar de policy voegt geen management rollen toe.

## Oplossing

### Deel 1: Aftersales Dashboard Uitbreiden

**Bestand:** `src/components/reports/AftersalesDashboard.tsx`

Wijzigingen:
1. Import toevoegen: `TaskForm`, `updateTaskStatus` van taskService, `useMutation`
2. State toevoegen: `showTaskForm`, `selectedTaskForAction`
3. "Nieuwe Taak" knop toevoegen in de Taken Overzicht header
4. Actie kolom toevoegen aan de taken tabel met:
   - "Start" knop (voor status toegewezen -> in_uitvoering)
   - "Voltooid" knop (voor alle niet-voltooide taken)
5. Query invalidatie na status update

**Nieuwe tabel structuur:**
```text
| Taak | Voertuig | Toegewezen Aan | Deadline | Status | Actie |
|------|----------|----------------|----------|--------|-------|
|      |          |                |          |        | [Start] [Voltooid] |
```

### Deel 2: RLS Policy Verbeteren (optioneel)

De huidige INSERT policy `assigned_by = auth.uid()` werkt correct omdat `taskService.createTask()` altijd `assigned_by` zet naar de huidige gebruiker. Dit hoeft niet gewijzigd te worden.

De UPDATE/SELECT policies bevatten al `aftersales_manager`, dus taken voltooien/updaten werkt al op database niveau.

## Technische Details

### AftersalesDashboard.tsx Wijzigingen

```typescript
// Nieuwe imports
import { Plus, PlayCircle, CheckCircle } from 'lucide-react';
import { TaskForm } from '@/components/tasks/TaskForm';
import { updateTaskStatus } from '@/services/taskService';
import { useMutation } from '@tanstack/react-query';

// Nieuwe state
const [showTaskForm, setShowTaskForm] = useState(false);

// Mutation voor status updates
const updateStatusMutation = useMutation({
  mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
    updateTaskStatus(taskId, status as any),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['aftersales-dashboard'] });
    toast({ description: "Taakstatus bijgewerkt" });
  },
  onError: () => {
    toast({ variant: "destructive", description: "Fout bij het bijwerken van de taakstatus" });
  }
});

// Handlers
const handleStartTask = (taskId: string) => {
  updateStatusMutation.mutate({ taskId, status: 'in_uitvoering' });
};

const handleCompleteTask = (taskId: string) => {
  updateStatusMutation.mutate({ taskId, status: 'voltooid' });
};
```

### UI Aanpassingen

**Taken Overzicht Header:**
```tsx
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle className="flex items-center gap-2">
      <ClipboardList className="h-5 w-5" />
      Taken Overzicht
    </CardTitle>
    <Button onClick={() => setShowTaskForm(true)} size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Nieuwe Taak
    </Button>
  </div>
</CardHeader>
```

**Tabel met actie kolom:**
```tsx
<th className="pb-3 font-medium">Actie</th>
// ...
<td className="py-3">
  <div className="flex gap-1">
    {task.status === 'toegewezen' && (
      <Button size="sm" variant="outline" onClick={() => handleStartTask(task.id)}>
        <PlayCircle className="h-4 w-4 mr-1" />
        Start
      </Button>
    )}
    <Button size="sm" variant="default" onClick={() => handleCompleteTask(task.id)}>
      <CheckCircle className="h-4 w-4 mr-1" />
      Voltooid
    </Button>
  </div>
</td>
```

## Bestandswijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/reports/AftersalesDashboard.tsx` | Taak acties toevoegen (Start, Voltooid, Nieuwe Taak) |

## Geen Database Wijzigingen Nodig

De huidige RLS policies ondersteunen al:
- `aftersales_manager` kan alle taken zien (SELECT policy)
- `aftersales_manager` kan alle taken updaten (UPDATE policy)
- Nieuwe taken worden correct aangemaakt (INSERT met `assigned_by = auth.uid()`)

## Verwacht Resultaat

Na implementatie kan de Aftersales Manager vanuit het Rapportages menu:
1. Alle taken van alle medewerkers zien
2. Op "Nieuwe Taak" klikken om een taak aan te maken
3. Op "Start" klikken om een taak te starten (status -> in_uitvoering)
4. Op "Voltooid" klikken om een taak af te ronden (status -> voltooid)
5. Via "Bekijk" bij B2C leveringen naar de voertuigdetails gaan en daar checklist items afvinken en taken toewijzen (dit werkt al)

