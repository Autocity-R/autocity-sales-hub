

## Kevin Voorraadbewaking Dashboard — Compleet Redesign

### Huidige situatie
- 118 voertuigen online, gemiddeld 59 stagedagen
- 57 auto's boven 45 stagedagen (kritiek), slechts 1 ondergeprijsd
- Dashboard is nu een platte tabel — geen prioritering, geen acties, niet scanbaar

### Wat we bouwen (alles in 1x)

Het dashboard wordt opgesplitst in modulaire componenten binnen een nieuwe `kevin/` subfolder.

### Architectuur

```text
KevinDashboard.tsx (orchestrator — KPI strip + sectie-indeling)
├── kevin/KevinKPIStrip.tsx        (6 KPI cards bovenaan)
├── kevin/KevinActionList.tsx      (🔴🟡🟢 tiered lijsten met collapse)
├── kevin/KevinVehicleCard.tsx     (compact kaartje per voertuig in actielijst)
├── kevin/KevinFullTable.tsx       (volledige tabel met filters/sortering)
├── kevin/KevinMarketShifts.tsx    (marktveranderingen uit jpcars_market_history)
└── kevin/KevinTopModels.tsx       (fast movers uit taxatie_valuations)
```

### Sectie 1: KPI Strip (bovenaan)
6 kaarten in een rij:
- **Online** — totaal aantal voertuigen
- **Gem. Stagedagen** — gemiddelde + kleur (groen <35, geel 35-45, rood >45)
- **🔴 Actie vereist** — count (stock >45 OF rankPct >0.8 OF price_warning >2000)
- **🟡 Let op** — count (stock 35-45 OF rankPct 0.5-0.8 OF price_warning 500-2000)
- **🟢 Goed** — count
- **Sync/CSV** — laatste sync + knoppen

### Sectie 2: Actielijst (kern van het dashboard)
Drie collapsible secties, gesorteerd op prioriteit:

**🔴 VANDAAG DOEN** (default open, max 5 zichtbaar + "Toon alle X"):
Per voertuig een compact card met:
- Merk/Model + kenteken
- Stagedagen (bold rood als >45)
- Online prijs + advies (Verhoog/Zak €X)
- Rang positie (X/Y)
- **Reden** waarom deze rood is (bijv. "52 stagedagen", "Rang 28/35", "Zak €1.759")

**🟡 DEZE WEEK** (default collapsed):
Zelfde card layout, gele accenten

**🟢 GEEN ACTIE** (default collapsed, alleen count):
Compacte lijst

### Sectie 3: Marktshifts (uit `jpcars_market_history`)
- Vergelijk huidige rank/prijs met oudste snapshot per kenteken
- Toon voertuigen waar rang verslechterd is (hoger geworden = duurder geworden relatief)
- Toon prijsveranderingen in de markt
- Compact: max 5 items, "Zie alles" link

### Sectie 4: Top Inkoopkansen (uit `taxatie_valuations`)
- Query modellen met hoge ETR, lage stagedagen uit JP Cars data
- Toon als suggestielijst: model, gemiddelde stagedagen, ETR score
- Max 5 items

### Sectie 5: Volledige Tabel (collapsible, default collapsed)
- Dezelfde tabel als nu maar met filters:
  - Status filter (Rood/Geel/Groen)
  - Brandstof filter
  - Sortering (stagedagen, prijs, rang)
- Verplaatst naar eigen component `KevinFullTable.tsx`

### Technische details

**Geen database wijzigingen nodig** — alle data komt uit bestaande tabellen:
- `jpcars_voorraad_monitor` — hoofddata
- `jpcars_market_history` — trends (252 records, 44 kentekens)
- `taxatie_valuations` — fast movers data

**Categorisatie logica** (ongewijzigd uit huidige code):
- Rang 1 = goedkoopst (goed), rankPct = rank/window_size
- Rood: rankPct > 0.8 OF price_warning > 2000 OF stock > avg*1.3
- Geel: rankPct > 0.5 OF price_warning > 500 OF stock > avg
- Groen: rest

**Nieuwe componenten**: 6 bestanden in `src/components/ai-agents/dashboards/kevin/`

**KevinDashboard.tsx** wordt de orchestrator die alle sub-componenten importeert en de data doorgeeft via props. De data-fetching en deduplicatie blijft in het hoofdbestand.

### Wat Kevin ziet als hij inlogt

```text
┌─────────────────────────────────────────────────┐
│  Online: 118  │  Gem. Dagen: 59  │  🔴 57      │
│  🟡 5         │  🟢 56           │  Sync: 10:00│
├─────────────────────────────────────────────────┤
│ 🔴 ACTIE VEREIST — 57 voertuigen      [▼ open] │
│  ┌──────────────────────────────────────┐       │
│  │ VW Tiguan · NB · 451 dagen          │       │
│  │ €43.950 · Zak €1.759 · Rang 11/22  │       │
│  │ Reden: 451 stagedagen (gem: 110)    │       │
│  └──────────────────────────────────────┘       │
│  ... +4 meer  [Toon alle 57]                    │
├─────────────────────────────────────────────────┤
│ 🟡 LET OP — 5 voertuigen           [▶ ingekl.] │
├─────────────────────────────────────────────────┤
│ 🟢 GOED — 56 voertuigen            [▶ ingekl.] │
├─────────────────────────────────────────────────┤
│ 📊 MARKTSHIFTS                                  │
│  BMW 3-Serie: rang 26→28 (verslechterd)         │
├─────────────────────────────────────────────────┤
│ 📈 TOP INKOOPKANSEN                             │
│  Kia Niro · gem 18 dagen · ETR 4.2              │
├─────────────────────────────────────────────────┤
│ 📋 VOLLEDIGE TABEL              [▶ uitklappen]  │
└─────────────────────────────────────────────────┘
```

