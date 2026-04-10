

## Plan: Fix Voorraad ROI berekening in AlexDashboard

### Probleem
De ROI-tegel toont 0 (of 0.27) in plaats van 27.3%. De berekening `Math.round((omzet / waarde) * 100) / 100` geeft een decimaal getal (0.27) terug in plaats van een percentage. Bovendien mist het `%`-teken in de weergave.

### Oplossing

**Bestand: `src/components/ai-agents/dashboards/AlexDashboard.tsx`**

1. **ROI berekening aanpassen** (regel 87) — percentage als getal opleveren:
```typescript
// Van:
voorraadRoi: totaalVoorraadWaarde > 0 ? Math.round((omzet_mtd / totaalVoorraadWaarde) * 100) / 100 : 0,

// Naar:
voorraadRoi: totaalVoorraadWaarde > 0 
  ? Math.round((omzet_mtd / totaalVoorraadWaarde) * 1000) / 10 
  : 0,
```
Dit geeft `27.4` in plaats van `0.27`.

2. **ROI weergave aanpassen** (regel 200-207) — percentage tonen + betere subtekst:
```typescript
{
  label: 'Voorraad ROI',
  value: `${kpis?.voorraadRoi || 0}%`,
  sub: `${kpis?.voorraadRegulair || 0} regulier + ${kpis?.voorraadInruil || 0} inruil = ${kpis?.voorraadTotaal || 0} totaal | €${(Math.round((kpis?.voorraadWaarde || 0) / 1000)).toLocaleString()}k`,
  icon: Package,
  trend: (kpis?.voorraadRoi || 0) >= 25 ? 'up' : 'down',
  color: (kpis?.voorraadRoi || 0) >= 25 ? 'text-green-600' : 'text-purple-700',
}
```

### Verwacht resultaat
- ROI tegel toont: **27.4%**
- Subtekst: **137 regulier + 40 inruil = 177 totaal | €4.359k**
- Trend pijl: groen als ≥25%, anders paars

