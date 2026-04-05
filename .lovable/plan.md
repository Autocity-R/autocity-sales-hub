

## Fix: JP Cars Monitor — Correcte data interpretatie en CRM tab verwijderen

### Problemen

1. **202 dubbele records** in database (125 uniek) — sync deduplicatie werkt niet goed genoeg
2. **`price_warning` wordt fout geïnterpreteerd** — het is een delta ("zak €X om rang te verbeteren"), niet een absolute prijs. `price_local > price_warning` is altijd true
3. **Rang schaal verkeerd** — rang loopt van 1 tot 301+, hogere rang = beter. Huidige drempels (<15 = rood) kloppen niet
4. **Prijs vs marktwaarde kleuren omgedraaid** — positief verschil (duurder dan markt) wordt groen getoond, moet rood zijn
5. **`value` wordt als marktwaarde gebruikt** — beter is `vvp_50` (mediaan marktprijs)
6. **CRM Voorraad tab is overbodig** — Kevin werkt vanuit JP Cars data

### Wijzigingen

**Bestand: `src/components/ai-agents/dashboards/KevinDashboard.tsx`**

#### 1. Fix `categorize()` functie
```
Nieuwe logica:
- 🟢 Goed: rank_current > 50
- 🟡 Let op: rank_current 20-50
- 🔴 Actie: rank_current < 20
- 🔴 Actie: stock_days > stock_days_average × 1.3
- 🔴 Actie: price_warning > 1000 (auto moet > €1000 zakken)
- 🟡 Let op: price_warning > 500
```

#### 2. Fix marktwaarde kolom — gebruik `vvp_50` i.p.v. `value`
- "Marktwaarde" kolom toont `vvp_50` (mediaan marktprijs vergelijkbare auto's)
- `price_vs_value` wordt `price_local - vvp_50`
- Kolom hernoemd naar "VVP50 (markt mediaan)"

#### 3. Fix prijs vs markt kleuren — omdraaien
- Positief verschil (duurder dan markt) = **rood** (te duur)
- Negatief verschil (goedkoper dan markt) = **groen** (scherp geprijsd)

#### 4. Fix Online Prijs kolom — price_warning als advies
- Verwijder foutieve `price_local > price_warning` check
- Toon onder de prijs: "Advies: zak €[price_warning]" wanneer price_warning > 0

#### 5. Fix rang kleuren — hogere rang = beter
- `rank > 50` = groen, `20-50` = geel, `< 20` = rood
- Toon `rank_current / window_size` voor context

#### 6. Verwijder CRM Voorraad tab
- Verwijder de `crmVehicles` query en de hele CRM tab
- Verwijder `TabsList`/`Tabs` wrapper (niet meer nodig met 1 view)
- Houd de JP Cars Monitor als enige view

#### 7. Database deduplicatie verbeteren
**Bestand: `supabase/functions/jpcars-sync/index.ts`**
De deduplicatie code bestaat al maar de database heeft nog dubbelen. Volgende sync fixt dit. Geen code wijziging nodig — de dedup logica uit de vorige fix werkt correct.

### Resultaat
- Categorisatie klopt: mediaan rang is 11, dus veel auto's staan terecht laag — maar het dashboard toont dit correct i.p.v. alles als "kritiek"
- Prijsadvies is actionable: "Zak €864 om rang te verbeteren"
- Marktpositie in één oogopslag: prijs vs VVP50 mediaan met correcte kleuren
- Geen overbodige CRM tab meer

