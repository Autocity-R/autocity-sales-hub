

# Plan: Taak Omschrijving in Excel Export

## Het Probleem

Momenteel toont de Excel werklijst alleen de **titel** van de taak (bijv. "Kia e-Niro"). De **omschrijving** (wat er daadwerkelijk gedaan moet worden) wordt niet getoond.

## De Oplossing

De "Taak" kolom aanpassen zodat de **omschrijving (description)** wordt getoond in plaats van de titel.

## Voorbeeld

**Nu:**
| Merk | Model | Kenteken | VIN | Taak | ✓ |
|------|-------|----------|-----|------|---|
| Kia | e-Niro | J-481-VK | ...ABC12 | Kia e-Niro | ○ |

**Na aanpassing:**
| Merk | Model | Kenteken | VIN | Taak | ✓ |
|------|-------|----------|-----|------|---|
| Kia | e-Niro | J-481-VK | ...ABC12 | Interieur reinigen en stofzuigen | ○ |

## Technische Wijziging

**Bestand:** `src/utils/taskExportExcel.ts`

**Regel 106 wijzigen van:**
```typescript
task.title || task.description,
```

**Naar:**
```typescript
task.description || task.title,
```

Dit zorgt ervoor dat:
- De omschrijving (description) wordt getoond als deze bestaat
- Als er geen omschrijving is, valt het terug op de titel

## Bestandswijzigingen

| Bestand | Actie |
|---------|-------|
| `src/utils/taskExportExcel.ts` | Wijzigen - regel 106 aanpassen |

