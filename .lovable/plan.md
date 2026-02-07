

# Plan: Openstaande Toewijzingen Tonen in B2C Leveringen

## Samenvatting

Een nieuwe indicator toevoegen aan de B2C Leveringen tabel die toont hoeveel checklist items nog geen taak toegewezen hebben. Hiermee kan de aftersales manager direct zien waar nog actie nodig is in de planning.

## Visueel Concept

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  B2C Leveringen in Afwachting                                                             │
├────────────────┬──────────┬───────────┬────────────┬──────────────────┬────────┬─────────┤
│  Voertuig      │ Klant    │ Wachttijd │ Checklist  │ Toe te wijzen    │ Status │ Actie   │
├────────────────┼──────────┼───────────┼────────────┼──────────────────┼────────┼─────────┤
│  VW Golf       │ Jan      │ 12 dagen  │ ████░ 3/5  │ ⚠ 2 taken        │ Blauw  │ Bekijk  │
│  Audi A3       │ Piet     │ 8 dagen   │ █████ 5/5  │ ✓ Alles gepland  │ Groen  │ Bekijk  │
│  BMW 3-serie   │ Klaas    │ 5 dagen   │ ░░░░░ 0/4  │ ⚠ 4 taken        │ Rood   │ Bekijk  │
└────────────────┴──────────┴───────────┴────────────┴──────────────────┴────────┴─────────┘
```

## Logica voor "Toe te wijzen"

Een checklist item telt als "nog toe te wijzen" als:
1. Het item is **niet voltooid** (`completed !== true`)
2. Het item heeft **geen gekoppelde taak** (`linkedTaskId` is undefined/null)

Dit geeft een accurate weergave van wat er nog ingepland moet worden.

## Technische Wijzigingen

### 1. Type uitbreiden (`src/types/aftersales.ts`)

Nieuw veld toevoegen aan `PendingDeliveryExtended`:

```typescript
export interface PendingDeliveryExtended {
  // ...bestaande velden...
  
  // NIEUW: Aantal checklist items zonder toegewezen taak (en niet voltooid)
  unassignedTaskCount: number;
}
```

### 2. Service aanpassen (`src/services/aftersalesService.ts`)

In de `getPendingB2CDeliveries` methode het aantal ongekoppelde items berekenen:

```typescript
// Bestaande logica...
const checklist = details.preDeliveryChecklist || [];

// NIEUW: Tel items die niet voltooid zijn EN geen taak gekoppeld hebben
const unassignedTaskCount = Array.isArray(checklist)
  ? checklist.filter((item: any) => 
      item.completed !== true && !item.linkedTaskId
    ).length
  : 0;

return {
  // ...bestaande velden...
  unassignedTaskCount, // NIEUW
};
```

### 3. Dashboard UI aanpassen (`src/components/reports/AftersalesDashboard.tsx`)

Nieuwe kolom "Toe te wijzen" toevoegen aan de tabel:

```typescript
// In table header (regel 383-390):
<th className="pb-3 font-medium">Toe te wijzen</th>

// In table body (na checklist kolom):
<td className="py-3">
  {delivery.unassignedTaskCount === 0 ? (
    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
      <CheckCircle2 className="h-3 w-3 mr-1" />
      Gepland
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
      <ClipboardList className="h-3 w-3 mr-1" />
      {delivery.unassignedTaskCount} {delivery.unassignedTaskCount === 1 ? 'taak' : 'taken'}
    </Badge>
  )}
</td>
```

## Kleurcodering

| Status | Kleur | Betekenis |
|--------|-------|-----------|
| `0 taken` | Groen | Alles is ingepland ✓ |
| `1+ taken` | Oranje | Er moeten nog taken worden toegewezen ⚠ |

## Bestandswijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/types/aftersales.ts` | Nieuw veld `unassignedTaskCount` aan `PendingDeliveryExtended` |
| `src/services/aftersalesService.ts` | Berekening toevoegen voor ongekoppelde checklist items |
| `src/components/reports/AftersalesDashboard.tsx` | Nieuwe kolom "Toe te wijzen" in de B2C tabel |

## Verwacht Resultaat

1. Elke rij in de B2C Leveringen tabel toont hoeveel taken nog toegewezen moeten worden
2. Groen badge "Gepland" als alles is ingepland
3. Oranje badge met aantal als er nog taken ontbreken
4. Manager kan direct zien welke voertuigen aandacht nodig hebben
5. Klikken op "Bekijk" opent de checklist waar taken direct toegewezen kunnen worden

