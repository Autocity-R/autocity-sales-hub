

# Plan: Voltooiingsdatum en -tijd Tonen bij Voltooide Taken

## Probleem

Wanneer een taak wordt voltooid, wil je kunnen zien wanneer (datum en tijd) deze is afgerond. Dit helpt bij het monitoren van operationeel personeel en de aftersales manager.

## Huidige Situatie

- De database slaat `completed_at` al correct op wanneer een taak naar "voltooid" gaat
- Het `Task` type bevat al het `completedAt` veld
- De data wordt al opgehaald van de database
- **Probleem**: De voltooiingsdatum wordt nergens in de UI getoond

## Oplossing

De voltooiingsdatum en -tijd toevoegen aan drie componenten waar taken worden weergegeven:

### 1. Desktop Taakkaart (SortableTaskCard)

Voeg een nieuwe regel toe onder de deadline die de voltooiingsdatum toont wanneer `status === "voltooid"`:

```
Voltooid: 04 februari 2025 om 14:32
```

### 2. Mobiele Taakkaart (TaskMobileCard)

Voeg dezelfde informatie toe onder de deadline informatie.

### 3. Taak Detail Dialog (TaskDetail)

Voeg een nieuw veld toe in de details grid dat de voltooiingsdatum toont met een groen vinkje icoon.

## Visuele Weergave

De voltooiingsdatum wordt getoond met:
- Groen CheckCircle icoon (consistent met de "voltooid" status)
- Formaat: "dd MMMM yyyy om HH:mm" in het Nederlands
- Alleen zichtbaar bij taken met status "voltooid"

## Bestandswijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/tasks/DraggableTaskList.tsx` | Voltooiingsdatum toevoegen aan SortableTaskCard component |
| `src/components/tasks/TaskMobileCard.tsx` | Voltooiingsdatum toevoegen voor mobiele weergave |
| `src/components/tasks/TaskDetail.tsx` | Voltooiingsdatum toevoegen aan detail dialog |

## Technische Details

```typescript
// Voorbeeld code voor weergave:
{task.status === "voltooid" && task.completedAt && (
  <div className="flex items-center space-x-2">
    <CheckCircle className="h-4 w-4 text-green-500" />
    <span>Voltooid: {format(new Date(task.completedAt), "dd MMMM yyyy 'om' HH:mm", { locale: nl })}</span>
  </div>
)}
```

