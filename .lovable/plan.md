# Taxatie agents: documentatie + Claude-migratie

## Doel
De huidige taxatie-AI (inkoop-taxateur en bulk import) draait op OpenAI GPT-4o. We leveren eerst een volledig overzicht van de prompts en structuur op, en migreren vervolgens de **inkoop-taxateur (Nieuwe Taxatie)** en de **bulk-importflow** naar Claude.

## Huidige situatie (bevestigd)

### Agents en functies

| # | Agent / functie | Edge function | Model nu | Rol |
|---|---|---|---|---|
| 1 | Kenteken/RDW ophalen | `rdw-lookup` | geen AI | Basisvoertuigdata uit kenteken |
| 2 | Marktwaarde | `jpcars-lookup`, `jpcars-values`, `jpcars-options` | geen AI | JP Cars: basiswaarde, optiewaarde, APR/ETR, courantheid, window-listings |
| 3 | Marktvloer / concurrentie | `taxatie-portal-search` | `gpt-4o` + `web_search_preview` (fallback) | Primair JP Cars Window-listings; alleen bij leeg resultaat AI web search op Gaspedaal-URL |
| 4 | Interne historie | `taxatie-internal-search` | geen AI | Eigen verkochte vergelijkbare auto's: marge, statijd, B2B/B2C |
| 5 | **Inkoop-taxateur** | `taxatie-ai-advice` | `gpt-4o`, function calling, temp 0.3, max_tokens 3000 | 6-stappen methodiek → kopen/niet kopen, verkoopprijs, max inkoopprijs, marge, risico's, marktvloer. Leert van feedbackhistorie |
| 6 | **HENK inruil-taxateur** | `taxatie-trade-in-advice` | `gpt-4o`, function calling, temp 0.3 | Klant-transparant inruilscherm + verkoper-inkoppertjes |
| 7 | Excel-parser (bulk) | `analyze-excel-vehicles` | `google/gemini-2.5-flash` via Lovable AI Gateway | Herkent kolommen + rijen → gestructureerd voertuig incl. opties |
| 8 | Losse beschrijving-parser | `parse-vehicle-description` | `google/gemini-2.5-flash`, temp 0.1 | 1 vrije tekstregel → merk/model/uitvoering/jaar/brandstof |

### Flow enkele taxatie
```
kenteken → rdw-lookup ─┐
handmatig/JP Cars ─────┴→ vehicleData + geselecteerde opties + keywords
        ↓ startTaxatie()
  parallel: jpcars-lookup (waarde/APR/ETR/window)
            taxatie-portal-search (marktvloer + listings)
            taxatie-internal-search (eigen historie)
            fetchRecentFeedback() (leercontext)
        ↓
   taxatie-ai-advice  → AIAdviceCard
        ↓ feedback van gebruiker
   opgeslagen in taxatie_valuations / feedback-tabel
```

### Flow bulk import
```
Excel upload → slimme header-detectie (keyword-scan eerste 20 rijen)
  → analyze-excel-vehicles (Gemini) per batch rijen
  → per voertuig SEQUENTIEEL (met withTimeout + withRetry + delay, quota-limiet):
       jpcars → portal → internal → taxatie-ai-advice → saveTaxatieValuation
  → feedbackcontext 1x gecached voor de hele batch
  → export via src/services/bulkTaxatieExport.ts
```

## Op te leveren

### Fase 1 — Documentatie
Nieuw bestand `docs/taxatie-agents-prompts.md` met verbatim:
1. System prompt inkoop-taxateur (`taxatie-ai-advice`).
2. `buildTaxatiePrompt()` — de volledige user prompt builder.
3. `optionCategories` + `buildValueOptionsSection()` — waardebepalende opties.
4. `analyzeReasoningPatterns()` + `buildFeedbackLearningSection()` — leerlaag.
5. OpenAI function-tool schema voor `generate_taxatie_advice`.
6. HENK system prompt + `buildTradeInPrompt()` + schema `generate_trade_in_advice`.
7. `analyze-excel-vehicles` system + user prompt.
8. `parse-vehicle-description` prompt.
9. `taxatie-portal-search` web-search-fallback prompt.
10. Overzicht data-in/uit per agent en aandachtspunten bij migratie.

### Fase 2 — Inkoop-taxateur naar Claude
- Nieuwe edge function `taxatie-ai-advice-claude` (naast bestaande functie, zodat we A/B kunnen draaien).
- Bouwt dezelfde `TaxatieRequest` input af als `taxatie-ai-advice`.
- Hergebruikt `buildTaxatiePrompt()` en `buildFeedbackLearningSection()`; past ze aan naar Anthropic Messages API formaat.
- Output via Anthropic tool_use met een strikt JSON-schema (gelijkwaardig aan `generate_taxatie_advice`).
- Parse met bestaande `parseClaudeResponse` helper zoals andere AI Team agents.
- `src/services/taxatieService.ts` krijgt `generateAIAdviceClaude()` naast `generateAIAdvice()`.
- `src/hooks/useTaxatie.ts` krijgt een toggle/flag `useClaudeAdvice` (bijv. via env of gebruikersinstelling) om de nieuwe route te testen.
- Verificatie: minimaal 5 real-time taxaties draaien en output vergelijken met GPT-4o op prijs, marge en reasoning.

### Fase 3 — Bulk Import naar Claude
- Nieuwe edge function `analyze-excel-vehicles-claude` (naast bestaande Gemini-functie).
- Hergebruikt dezelfde system/user prompt structuur, maar aangepast naar Anthropic Messages API.
- `src/hooks/useBulkTaxatie.ts` krijgt keuze tussen Gemini en Claude voor de parser.
- `taxatie-ai-advice-claude` wordt optioneel gebruikt in de bulk-lus naast de OpenAI variant.
- Behoud bestaande quota-bescherming: sequentiële verwerking, `withTimeout`, `withRetry`, delay.
- Verificatie: upload een representatief Excel-bestand en vergelijk parse-confidentie + uiteindelijke adviezen.

### Fase 4 — Afbouw / doorschakelen
- Wanneer Claude-resultaten minstens gelijkwaardig zijn gedurende een testperiode, wordt de Claude-variant de default in `taxatieService.ts` en `useBulkTaxatie.ts`.
- Bestaande `taxatie-ai-advice` en `analyze-excel-vehicles` blijven bestaan als fallback.

## Technische details

### Modelkeuze
- Bestaande AI Team agents gebruiken directe Anthropic API calls met `model: 'claude-sonnet-4-20250514'`.
- Voor de taxatie-migratie starten we met hetzelfde patroon, maar verifiëren voor implementatie het exacte huidige catalogusmodel.
- Fallback bij onbeschikbaar model: behoud bestaande GPT-4o functies.

### API-schil
- Anthropic Messages API (`https://api.anthropic.com/v1/messages`).
- Tool calling via `tools` + `tool_choice: {type: 'tool', name: 'generate_taxatie_advice'}`.
- JSON-output extractie via `parseClaudeResponse` (bestaand projectpatroon).
- Vereist secret `ANTHROPIC_API_KEY` (aanwezig voor AI Team).

### Risico's en mitigaties
| Risico | Mitigatie |
|---|---|
| Claude is trager dan GPT-4o | Bulk blijft sequentieel met retry/timeout; enkele taxatie krijgt streaming of duidelijke laadstatus |
| Output-schema wijkt af | Strikt schema + `parseClaudeResponse` + fallback naar GPT-4o bij parsefout |
| Quota/limieten | Behoud bestaande OpenAI functies als fallback; monitor gateway-logs |
| Ander reasoning-stijl | A/B vergelijking op 20+ taxaties voordat default wordt omgezet |

## Niet in scope
- HENK inruil-taxateur (`taxatie-trade-in-advice`) blijft vooralsnog op GPT-4o.
- `taxatie-portal-search` web-search-fallback blijft op GPT-4o; alleen de adviesagent wordt gemigreerd.
- JP Cars lookups en interne historie blijven ongewijzigd.

## Acceptatiecriteria
- [ ] `docs/taxatie-agents-prompts.md` bevat alle prompts verbatim.
- [ ] `taxatie-ai-advice-claude` retourneert een valide advies-object voor een representatieve taxatie.
- [ ] `useTaxatie.ts` kan schakelen tussen GPT-4o en Claude.
- [ ] `analyze-excel-vehicles-claude` retourneert vergelijkbare parse-resultaten als Gemini.
- [ ] Bulk-import kan draaien met Claude voor zowel parser als advies.
- [ ] Typecheck `bunx tsgo --noEmit -p tsconfig.app.json` slaagt.
