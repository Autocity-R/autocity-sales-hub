

# Plan: Import Status Kleuren in Aftersales Dashboard

## Gewenste Kleuren

| Status | Kleur |
|--------|-------|
| Niet aangemeld | Rood |
| Aangekomen | Rood |
| Aanvraag Ontvangen | Geel |
| Goedgekeurd | Blauw |
| BPM Betaald | Blauw |
| Ingeschreven | Groen |

## Huidige Situatie

De `getImportStatusBadge` functie in `AftersalesDashboard.tsx` (regel 261-272) gebruikt generieke badge variants:

```typescript
const statusConfig = {
  'niet_aangemeld': { label: 'Niet aangemeld', variant: 'secondary' },
  'aanvraag_ontvangen': { label: 'Aanvraag ontvangen', variant: 'default' },
  'goedgekeurd': { label: 'Goedgekeurd', variant: 'default' },
  'bpm_betaald': { label: 'BPM betaald', variant: 'default' },
  'ingeschreven': { label: 'Ingeschreven', variant: 'outline' },
};
```

## Oplossing

De functie aanpassen om custom CSS classes te gebruiken voor de gewenste kleuren:

```typescript
const getImportStatusBadge = (status: string | null) => {
  const statusConfig: Record<string, { label: string; className: string }> = {
    'niet_aangemeld': { 
      label: 'Niet aangemeld', 
      className: 'bg-red-500 hover:bg-red-600 text-white' 
    },
    'aangekomen': { 
      label: 'Aangekomen', 
      className: 'bg-red-500 hover:bg-red-600 text-white' 
    },
    'aanvraag_ontvangen': { 
      label: 'Aanvraag ontvangen', 
      className: 'bg-yellow-500 hover:bg-yellow-600 text-white' 
    },
    'goedgekeurd': { 
      label: 'Goedgekeurd', 
      className: 'bg-blue-500 hover:bg-blue-600 text-white' 
    },
    'bpm_betaald': { 
      label: 'BPM betaald', 
      className: 'bg-blue-500 hover:bg-blue-600 text-white' 
    },
    'ingeschreven': { 
      label: 'Ingeschreven', 
      className: 'bg-green-500 hover:bg-green-600 text-white' 
    },
  };

  const config = statusConfig[status || ''] || { 
    label: status || 'Onbekend', 
    className: 'bg-gray-500 text-white' 
  };
  
  return <Badge className={config.className}>{config.label}</Badge>;
};
```

## Visueel Resultaat

```text
┌─────────────────────┐
│ Niet aangemeld      │  ← Rood
└─────────────────────┘

┌─────────────────────┐
│ Aangekomen          │  ← Rood
└─────────────────────┘

┌─────────────────────┐
│ Aanvraag ontvangen  │  ← Geel
└─────────────────────┘

┌─────────────────────┐
│ Goedgekeurd         │  ← Blauw
└─────────────────────┘

┌─────────────────────┐
│ BPM betaald         │  ← Blauw
└─────────────────────┘

┌─────────────────────┐
│ Ingeschreven        │  ← Groen
└─────────────────────┘
```

## Bestandswijziging

| Bestand | Wijziging |
|---------|-----------|
| `src/components/reports/AftersalesDashboard.tsx` | `getImportStatusBadge` functie aanpassen met custom kleuren (regels 261-272) |

## Verwacht Resultaat

- Beter visueel overzicht in het Aftersales Dashboard
- Rode statussen vallen direct op (actie nodig)
- Gele status geeft aan dat aanvraag in behandeling is
- Blauwe statussen tonen goedgekeurde/betaalde voertuigen
- Groene status toont volledig ingeschreven voertuigen

