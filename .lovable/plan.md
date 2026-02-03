
# Plan: Aftersales Manager Taakbeheer Rechten Repareren

## Probleem Geïdentificeerd

De aftersales manager (Lloyd) kan op dit moment:
- ❌ Geen taken afvinken van anderen
- ❌ Geen taken bewerken/verwijderen van anderen  
- ✅ Wel eigen taken aanmaken (werkt al via database)

**Oorzaak:** De UI componenten controleren alleen `isAdmin`, maar `aftersales_manager` is geen admin.

## Huidige Code (Fout)

In 4 bestanden staat deze logica:

```typescript
const { user, isAdmin } = useAuth();
const canManageTask = isAdmin || task.assignedTo === user?.id || task.assignedBy === user?.id;
const canEditDelete = isAdmin || task.assignedBy === user?.id;
```

De `aftersales_manager` wordt niet meegenomen, terwijl `useRoleAccess.ts` al de juiste functie heeft.

## Oplossing

Voeg `useRoleAccess` toe aan de task componenten en gebruik `canAssignTasks()` voor management rechten.

### Nieuwe Code

```typescript
const { user, isAdmin } = useAuth();
const { canAssignTasks } = useRoleAccess();
const hasManagementRights = isAdmin || canAssignTasks();

const canManageTask = hasManagementRights || task.assignedTo === user?.id || task.assignedBy === user?.id;
const canEditDelete = hasManagementRights || task.assignedBy === user?.id;
```

## Bestanden om aan te passen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/tasks/TaskMobileCard.tsx` | Toevoegen `useRoleAccess` + aanpassen permissie logica |
| `src/components/tasks/TaskListOptimized.tsx` | Toevoegen `useRoleAccess` + aanpassen permissie logica |
| `src/components/tasks/DraggableTaskList.tsx` | Toevoegen `useRoleAccess` + aanpassen permissie logica |
| `src/components/tasks/TaskDetail.tsx` | Toevoegen `useRoleAccess` + aanpassen permissie logica |

## Voorbeeld Wijziging (TaskMobileCard.tsx)

**Van:**
```typescript
import { useAuth } from "@/contexts/AuthContext";
// ...
const { user, isAdmin } = useAuth();
const canManageTask = isAdmin || task.assignedTo === user?.id || task.assignedBy === user?.id;
const canEditDelete = isAdmin || task.assignedBy === user?.id;
```

**Naar:**
```typescript
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
// ...
const { user, isAdmin } = useAuth();
const { canAssignTasks } = useRoleAccess();
const hasManagementRights = isAdmin || canAssignTasks();

const canManageTask = hasManagementRights || task.assignedTo === user?.id || task.assignedBy === user?.id;
const canEditDelete = hasManagementRights || task.assignedBy === user?.id;
```

## Resultaat na wijziging

| Functie | Admin/Owner | Manager | Verkoper | Aftersales Manager | Operationeel |
|---------|-------------|---------|----------|-------------------|--------------|
| Taken bekijken | ✅ | ✅ | ✅ | ✅ | Alleen eigen |
| Taken afvinken (allen) | ✅ | ✅ | ✅ | ✅ | Alleen eigen |
| Taken aanmaken | ✅ | ✅ | ✅ | ✅ | ❌ |
| Taken bewerken (allen) | ✅ | ✅ | ✅ | ✅ | Alleen eigen |
| Taken verwijderen | ✅ | ✅ | ✅ | ✅ | Alleen eigen |

## Database Status

De database RLS policies zijn al correct ingesteld:
- ✅ `aftersales_manager` kan taken SELECT (bekijken)
- ✅ `aftersales_manager` kan taken UPDATE (afvinken/bewerken)
- ✅ `aftersales_manager` kan taken INSERT (aanmaken)

Het probleem zit puur in de frontend UI permissies.
