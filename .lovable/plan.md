

## Fix: JP Cars Data Interpretatie Compleet Herstellen

### Wat er mis is

De hele logica is gebaseerd op een **verkeerde interpretatie** van JP Cars velden:

**1. Rang is omgekeerd begrepen**
- JP Cars: Rang 1 = goedkoopste positie in de markt (best gepositioneerd voor verkoop)
- Rang 30 = duurste positie = moeilijker te verkopen
- **Huidige code**: `rank < 20 = rood (actie)` — maar rank < 20 is juist GOED
- **Correct**: hoge rang (bijv. > 15 van window_size) = slecht gepositioneerd

**2. price_warning kan negatief zijn**
- `price_warning = -400` → JP Cars zegt: "je kunt €400 OMHOOG" (auto is ondergeprijsd)
- `price_warning = 864` → JP Cars zegt: "je moet €864 OMLAAG" (auto is overgeprijsd)
- **Huidige code**: toont altijd "Zak €X", ook bij negatieve waarden

**3. Categorisatie klopt niet**
Door de omgekeerde rang-interpretatie staat bijna alles verkeerd gekleurd.

### Database bewijs

| Auto | Rang | Window | Prijs | VVP50 | Warning | Betekenis |
|------|------|--------|-------|-------|---------|-----------|
| BMW iX3 | 3/3 | 3 | €45.950 | €47.019 | **-400** | Goed gepositioneerd, kan €400 omhoog |
| VW Golf | 1/31 | 31 | €12.950 | €14.669 | 215 | Goedkoopste van 31, €215 boven target |
| Mercedes C | 14/14 | 14 | €38.950 | €35.909 | 3.739 | Duurste van 14, moet €3.739 zakken |

### Wijzigingen

**Bestand: `src/components/ai-agents/dashboards/KevinDashboard.tsx`**

#### 1. Fix `categorize()` — rang correct interpreteren
Rang als percentage van window_size gebruiken (rang/window = positie in markt):
- Groen: rang in bovenste helft (rank <= window_size * 0.5) OF price_warning negatief (kan omhoog)
- Geel: rang in onderste helft maar niet kritiek
- Rood: rang bijna onderaan (rank > window_size * 0.8) OF price_warning > €2000 OF stock_days > markt gem. × 1.3

#### 2. Fix price_warning weergave
- **Negatief** (`-400`): toon in **groen**: "Verhoog €400" (auto is scherp geprijsd, marge mogelijk)
- **Positief** (`864`): toon in **oranje**: "Zak €864" (auto staat te duur voor target rang)
- **Nul/klein**: niets tonen

#### 3. Fix rang kleuren in tabel
- Rang als percentage van concurrenten: `rank / window_size`
- < 50% = groen (goed gepositioneerd)
- 50-80% = geel
- \> 80% = rood (duurste segment)
- Toon als "3/14" (rang 3 van 14 concurrenten)

#### 4. Alle overige logica ongewijzigd
- VVP50 vs price_local kleuren zijn al correct (positief = rood = te duur)
- Stagedagen vs markt gemiddelde logica is correct
- ETR/APR weergave is correct

### Resultaat
- Kevin ziet direct welke auto's te duur staan (hoge rang-positie, positieve price_warning)
- Auto's die scherp geprijsd zijn tonen groen met "Verhoog €X" — kans op extra marge
- Categorisatie reflecteert de werkelijke marktpositie

