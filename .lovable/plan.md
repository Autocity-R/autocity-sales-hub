

## Fix: ETR Data Pad Correctie

### Probleem
ETR toont "-" bij elke auto omdat het verkeerde pad wordt uitgelezen. De code zoekt `raw_data.etr` (bestaat niet), maar de waarde zit in `raw_data.apr_breakdown.etr.bound`.

Database bevestigt: elke auto heeft een ETR waarde (bijv. 3, 5) op het juiste pad.

### Wijziging

**Bestand:** `src/components/ai-agents/dashboards/KevinDashboard.tsx`

**Regel 142** — Verander het data pad:
```
// Van:
etr: (jp?.raw_data as any)?.etr ?? null

// Naar:
etr: (jp?.raw_data as any)?.apr_breakdown?.etr?.bound ?? null
```

Dat is alles. Eén regel, ETR kolom werkt direct.

