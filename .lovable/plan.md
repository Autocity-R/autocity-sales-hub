

## Plan: Vervang "Voorraad ROI" door Voorraadrotatie + Omloopsnelheid (90 dagen)

### Probleem
De vijfde KPI-tegel toont "Voorraad ROI" — geen bruikbare maatstaf in automotive. Moet vervangen worden door **Voorraadrotatie** (stock turns per jaar). De bestaande omloopsnelheid-tegel (tegel 4) gebruikt slechts 30 dagen — moet 90 dagen worden.

### Wijzigingen in `AlexDashboard.tsx`

**1. KPI berekening aanpassen (regels 32-88)**

- Verander `thirtyDaysAgo` naar `ninetyDaysAgo` (90 dagen)
- Omloopsnelheid berekenen over 90 dagen i.p.v. 30 dagen, alleen voor niet-inruil auto's
- Bereken `voorraadRotatie`: geannualiseerde omzet (3-maands omzet × 4) gedeeld door totale voorraadwaarde
- Verwijder `voorraadRoi` uit return object, vervang door `voorraadRotatie`
- Bereken 3-maands omzet apart voor de rotatie

**2. KPI tegel 4 — Omloopsnelheid updaten (regels 192-198)**
- Label: "Gem. omloopsnelheid" met sub "90 dagen | doel: ≤45d"
- Kleuren: groen ≤45, oranje 45-60, rood >60

**3. KPI tegel 5 — Vervang ROI door Voorraadrotatie (regels 200-207)**
- Label: "Voorraadrotatie"
- Value: `{rotatie}x` (bijv. "6.0x")
- Sub: voorraadinfo (regulier + inruil stuks + waarde)
- Kleuren: groen ≥8x, oranje 5-8x, rood <5x
- Icon: `Package` (blijft)

### Berekeningen (dynamisch, geen hardcoded waarden)

```typescript
// 90 dagen geleden
const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString();

// Omloopsnelheid: alleen niet-inruil, laatste 90 dagen
if (isSold && !isTradeIn && v.sold_date >= ninetyDaysAgo && v.online_since_date) {
  const days = (new Date(v.sold_date) - new Date(v.online_since_date)) / 86400000;
  if (days > 0) omloop.push(days);
}

// 3-maands omzet voor rotatie
const omzet_90d = vehicles.filter(v => isSold && v.sold_date >= ninetyDaysAgo)
  .reduce((s, v) => s + (v.selling_price || 0), 0);
const jaaromzet = (omzet_90d / 3) * 12;

// Voorraadrotatie
const voorraadRotatie = totaalVoorraadWaarde > 0
  ? Math.round((jaaromzet / totaalVoorraadWaarde) * 10) / 10
  : 0;
```

### Verwacht resultaat
- Tegel 4: **37d** — groen (≤45)
- Tegel 5: **6.0x** — oranje (5-8x range)
- Alle waarden 100% dynamisch uit de vehicles tabel

| Bestand | Actie |
|---------|-------|
| `src/components/ai-agents/dashboards/AlexDashboard.tsx` | Vervang ROI door rotatie, omloopsnelheid naar 90d |

