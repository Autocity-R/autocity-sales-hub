

## Plan: Alex JP Cars implementatie (met gecorrigeerde VOORRAAD NOOT)

Dit is het eerder goedgekeurde plan met één correctie: de VOORRAAD NOOT in het system prompt blok wordt vereenvoudigd.

### Deel 0 — Dubbele records fixen
Via SQL: `cron.unschedule('jpcars-voorraad-sync')` + duplicaten opschonen in `jpcars_voorraad_monitor`.

### Deel 1 — Alex system prompt uitbreiden
Via SQL update van `ai_agents` tabel. Het JP Cars blok bevat ETR/APR definities, alle velden, prijspositie meetmethode, strategische beslisregels.

**Gecorrigeerde VOORRAAD NOOT:**
```
VOORRAAD NOOT:
De JP Cars monitor toont alleen auto's die online staan in de verkoopportalen.
Gebruik deze data voor op- en afprijzingen van de online voorraad.
```

### Deel 2 — 6 tools in `alex-ceo-chat/index.ts`
Tool-use loop (max 5 iteraties) met:
1. `analyze_market_composition(groupBy)` — segmentoverzicht
2. `analyze_segment_performance(fuel, make, max_price)` — diepteanalyse
3. `evaluate_purchase_risk(make, model, proposed_purchase_price)` — inkooprisico
4. `portfolio_pricing_scan()` — voorraadscan risico/kansen
5. `analyze_price_history()` — afprijsgedrag
6. `get_market_snapshot()` — real-time marktoverzicht

Alle tools bevatten client-side deduplicatie op `license_plate`.

### Deel 3 — Briefing aanpassen
`alex-dagelijkse-briefing/index.ts`: JP Cars marktdata toevoegen aan briefing context.

### Bestanden

| Bestand | Actie |
|---------|-------|
| `ai_agents` tabel (SQL) | System prompt uitbreiden met gecorrigeerde VOORRAAD NOOT |
| `supabase/functions/alex-ceo-chat/index.ts` | 6 tools + tool-use loop |
| `supabase/functions/alex-dagelijkse-briefing/index.ts` | Marktdata in briefing |
| Cron jobs (SQL) | `jpcars-voorraad-sync` unschedule + duplicaten opschonen |

