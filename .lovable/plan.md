## Plan: Alex JP Cars dedup verwijderen

### Probleem
De `dedup()` helper in `supabase/functions/alex-ceo-chat/index.ts` filtert auto's op uniek `license_plate`. JP Cars levert echter al unieke records — meerdere auto's kunnen daarbij hetzelfde (lege/placeholder) kenteken hebben. Resultaat: Alex ziet maar ~10 auto's i.p.v. ~120.

### Wijziging
In `supabase/functions/alex-ceo-chat/index.ts`:

1. **`dedup()` functie verwijderen** (regels 16-23).
2. In elk van de 6 tools `const uniek = dedup(data || [])` vervangen door `const auto_lijst = data ?? []` en alle verdere referenties van `uniek` → `auto_lijst`:
   - `analyze_market_composition`
   - `analyze_segment_performance`
   - `evaluate_purchase_risk`
   - `portfolio_pricing_scan`
   - `analyze_price_history` (let op: `metAfprijzing` blijft afgeleid van `auto_lijst`)
   - `get_market_snapshot`

### Bestanden
- `supabase/functions/alex-ceo-chat/index.ts` — alleen tekstvervangingen, geen logicawijzigingen.

### Resultaat
Alex baseert al zijn marktanalyses op de volledige ~120 auto's uit `jpcars_voorraad_monitor`.
