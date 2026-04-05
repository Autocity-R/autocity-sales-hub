

## Plan: Alle AI Team agents naar Claude migreren

### Scope
- **WEL aanpassen**: `hendrik-ai-chat` edge function (gebruikt door alle 6 AI Team agents: Jacob/Alex, Marco, Lisa, Daan, Kevin, Sara)
- **NIET aanpassen**: Taxatie functies (`taxatie-ai-advice`, `taxatie-trade-in-advice`), email functies (`generate-b2b-email`, `hendrik-ai-email-generator`, `process-email-with-ai`) — die blijven op OpenAI

### Stap 0: ANTHROPIC_API_KEY toevoegen als Supabase secret
De key die je gaf (`sk-ant-api03-...`) wordt als secret opgeslagen. Daarna beschikbaar als `Deno.env.get('ANTHROPIC_API_KEY')` in alle edge functions.

### Stap 1: `hendrik-ai-chat` omzetten van OpenAI naar Claude
Bestand: `supabase/functions/hendrik-ai-chat/index.ts`

Drie wijzigingen in dit bestand:

**1a. API aanroep switchen** (regels 299-314)
- Van: `https://api.openai.com/v1/chat/completions` met `OPENAI_API_KEY` en model `gpt-4o`
- Naar: `https://api.anthropic.com/v1/messages` met `ANTHROPIC_API_KEY` en model `claude-sonnet-4-20250514`
- Headers: `x-api-key` + `anthropic-version: 2023-06-01`
- Body format: `system` apart (niet in messages array), `max_tokens` verplicht

**1b. Functions format converteren naar Claude tools** (regels 1508-1659)
- OpenAI `functions` format → Claude `tools` format
- Elke function wordt: `{ name, description, input_schema: { type: 'object', properties, required } }`
- `function_call: 'auto'` → `tool_choice: { type: 'auto' }`

**1c. Response parsing aanpassen** (regels 322-376)
- OpenAI: `choices[0].message.content` + `function_call`
- Claude: `content[]` array met `type: 'text'` en `type: 'tool_use'` blokken
- Tool use response: stuur `tool_result` terug in een follow-up call
- Follow-up call (regels 341-358) ook naar Claude API

**1d. Conversation messages format** (functie `buildConversationMessages`, regel 1666)
- OpenAI: `{ role: 'system', content }` in messages array
- Claude: `system` parameter apart, messages alleen `user` en `assistant`

### Stap 2: Kevin-specifieke edge function (apart)
Nieuw bestand: `supabase/functions/kevin-ai-chat/index.ts`
- Gebruikt ook Claude API via `ANTHROPIC_API_KEY`
- Haalt JP Cars marktdata + CRM voorraad op als context
- Routing in `AgentChat.tsx`: Kevin ID → `kevin-ai-chat`, rest → `hendrik-ai-chat`

### Stap 3: Routing aanpassen
Bestand: `src/components/ai-agents/AgentChat.tsx` (regel 91)
- Kevin (`b4000000-0000-0000-0000-000000000004`) → `kevin-ai-chat`
- Alle andere agents → `hendrik-ai-chat` (nu op Claude)

### Stap 4: Config.toml
Toevoegen: `[functions.kevin-ai-chat]` met `verify_jwt = false`

### Stap 5: jpcars-sync history writes
Bestand: `supabase/functions/jpcars-sync/index.ts`
Na sync: batch INSERT naar `jpcars_market_history`

### Bestanden overzicht

| Actie | Bestand | Wat |
|-------|---------|-----|
| Secret | ANTHROPIC_API_KEY | Toevoegen als Supabase secret |
| Edit | `supabase/functions/hendrik-ai-chat/index.ts` | OpenAI → Claude API (alle agents) |
| Nieuw | `supabase/functions/kevin-ai-chat/index.ts` | Kevin met JP Cars marktdata + Claude |
| Edit | `src/components/ai-agents/AgentChat.tsx` | Kevin routing naar kevin-ai-chat |
| Edit | `supabase/config.toml` | kevin-ai-chat registratie |
| Edit | `supabase/functions/jpcars-sync/index.ts` | History writes |

### Technische details Claude API format

```typescript
// Claude API call
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'),
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    system: systemPrompt,        // apart, niet in messages
    messages: conversationMessages, // alleen user/assistant
    max_tokens: 2000,
    tools: claudeTools,           // i.p.v. functions
    tool_choice: { type: 'auto' },
  }),
});

// Response parsing
const data = await response.json();
const textBlocks = data.content.filter(b => b.type === 'text');
const toolBlocks = data.content.filter(b => b.type === 'tool_use');
```

### Wat NIET verandert
- Alle data-loading functies (2000+ regels) blijven exact hetzelfde
- System prompt generatie blijft hetzelfde
- Memory management blijft hetzelfde
- Alleen de AI API aanroep en response parsing verandert

