

## Plan: APR definitie correctie — van "prijspositie" naar "databetrouwbaarheid"

### Scope

APR wordt op 10+ plekken fout gelabeld als "prijspositie". Overal moet het worden: **Automated Price Rating = betrouwbaarheid van de JP Cars voorspelling**. Prijspositie wordt gemeten via `rank_current` en `vvp_25/50/75`.

### Wijzigingen

#### Frontend (labels en uitleg)

| Bestand | Wat |
|---------|-----|
| `src/components/taxatie/results/CourantheidCard.tsx` | APR label: "Prijspositie" → "Databetrouwbaarheid". Badge: "Uitstekend"→"Betrouwbare data", "Gemiddeld"→"Matige data", "Laag"→"Onbetrouwbare data". Uitleg: scherp geprijsd → betrouwbare data teksten |
| `src/components/taxatie/results/JPCarsCard.tsx` | APR label: "APR (Prijspositie)" → "APR (Databetrouwbaarheid)" |
| `src/components/ai-agents/dashboards/kevin/KevinFullTable.tsx` | APR kolom tooltip aanpassen (geen label-wijziging nodig, data is numeriek) |
| `src/types/taxatie.ts` | Comments updaten: "prijspositie" → "databetrouwbaarheid" |

#### Edge Functions (comments en AI prompts)

| Bestand | Wat |
|---------|-----|
| `supabase/functions/jpcars-lookup/index.ts` | Alle comments "prijspositie" → "databetrouwbaarheid". **Courantheid functie**: APR uit de berekening halen — courantheid moet alleen op ETR gebaseerd zijn (APR = datakwaliteit, niet courantheid) |
| `supabase/functions/taxatie-ai-advice/index.ts` | Prompt regel 719: "APR (prijspositie)" → "APR (databetrouwbaarheid): hoge APR = betrouwbare voorspelling, lage APR = weinig vergelijkingsdata" |
| `supabase/functions/kevin-ai-chat/index.ts` | Regel 618: "APR: X%" context aanpassen naar "APR (datakwaliteit): X" |

#### Courantheid herberekening

De `determineCourantheid()` functie in `jpcars-lookup/index.ts` combineert nu APR+ETR. Dit is fout — APR zegt niets over hoe snel een auto verkoopt. Fix:

```text
// OUD (fout): combined = (apr + etr) / 2
// NIEUW: courantheid = puur ETR-gebaseerd
ETR >= 4 → hoog
ETR >= 2.5 → gemiddeld  
ETR < 2.5 → laag
```

### Geen wijzigingen nodig

- ETR labels en logica — al correct
- `dealerSearchExport.ts` / `bulkTaxatieExport.ts` — APR is daar alleen een numerieke kolom, geen label
- Database velden — `apr` blijft `apr`, alleen de interpretatie verandert

### Samenvatting

8 bestanden, hoofdzakelijk label-wijzigingen. Kritieke logica-fix in `determineCourantheid()` om APR eruit te halen. Edge functions moeten herdeployed worden na de wijziging.

