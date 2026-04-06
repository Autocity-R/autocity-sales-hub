

## Fix hendrik-ai-chat: Agent-specifieke prompts + Tool loop + Marco tools

### Probleem
`hendrik-ai-chat/index.ts` is hardcoded als "Jacob CEO AI". Alle agents die via deze function draaien (Marco, Lisa, Daan, Sara, Alex) krijgen dezelfde CEO-prompt en CEO-tools. Marco's 4.954 karakter system_prompt in de database wordt volledig genegeerd. Daarnaast heeft de tool loop dezelfde bug als kevin-ai-chat had: tussentekst wordt teruggestuurd.

### Plan (1 bestand: `supabase/functions/hendrik-ai-chat/index.ts`)

---

**Stap 1 — Agent prompt laden uit database**

Rond regel 263, na het parsen van de request body, de agent ophalen:

```typescript
const { data: agentData } = await supabaseClient
  .from('ai_agents')
  .select('name, system_prompt, capabilities')
  .eq('id', agentId)
  .single();

const agentName = agentData?.name || 'AI Agent';
const agentSystemPrompt = agentData?.system_prompt || '';
```

Dan in de prompt-opbouw (rond regel 290):
- Als `agentSystemPrompt` aanwezig is, gebruik die als basis in plaats van `buildStrategicCEOPrompt()`
- Injecteer de live data (ceoData) als context-blok achter de agent-specifieke prompt
- Memory context alleen laden voor Alex/Jacob (CEO agent), niet voor Marco/Lisa/etc.

De tools worden ook agent-specifiek:
- Alex/Jacob → bestaande `getStrategicCEOFunctions()` 
- Marco → `getMarcoTools()` (nieuw, zie stap 3)
- Overige agents → subset van bestaande tools relevant voor hun rol

---

**Stap 2 — Tool loop fix (regels 340-389)**

Vervang de huidige `if (toolBlocks.length > 0)` + `if (!responseMessage)` logica door de Kevin-patroon loop:

```typescript
let currentContent = claudeData.content;
let currentMessages = [...claudeMessages];
let responseMessage = '';

for (let toolRound = 0; toolRound < 3; toolRound++) {
  const toolBlocks = currentContent?.filter(b => b.type === 'tool_use') || [];
  const textBlocks = currentContent?.filter(b => b.type === 'text') || [];

  if (toolBlocks.length === 0) {
    responseMessage = textBlocks.map(b => b.text).join('\n');
    break;
  }

  // Tools called — execute ALL, ignore interim text
  const toolResults = [];
  for (const toolCall of toolBlocks) {
    const result = await handleStrategicCEOFunctionCall(supabaseClient, 
      { name: toolCall.name, arguments: JSON.stringify(toolCall.input) }, ceoData);
    toolResults.push({
      type: 'tool_result',
      tool_use_id: toolCall.id,
      content: JSON.stringify(result),
    });
  }

  currentMessages = [
    ...currentMessages,
    { role: 'assistant', content: currentContent },
    { role: 'user', content: toolResults },
  ];

  // Follow-up call with tools enabled (Claude may call another tool)
  const followUp = await fetch(claudeEndpoint, { ... });
  currentContent = followUpData.content;
}
```

Dit garandeert:
- Tussentekst ("Laat me even de data ophalen") wordt nooit teruggestuurd
- Follow-up call gebeurt ALTIJD na een tool_use
- Meerdere opeenvolgende tool calls worden ondersteund (max 3 rondes)

---

**Stap 3 — Marco-specifieke tools toevoegen**

Nieuwe functie `getMarcoTools()` met 4 tools:

| Tool | Description | Filter |
|------|-------------|--------|
| `get_cmr_pending` | "Aangekomen voertuigen waarvoor de CMR nog niet is verstuurd. Gebruik bij vragen over CMR versturen." | `transportStatus === 'aangekomen'` AND `cmrSent !== true` AND niet trade-in |
| `get_missing_papers` | "Aangekomen voertuigen waarvan papieren nog ontbreken. Gebruik bij vragen over ontbrekende papieren/documenten." | `transportStatus === 'aangekomen'` AND `papersReceived !== true` AND niet trade-in |
| `get_transport_details` | "Voertuigen die nog onderweg zijn. ALLEEN voor transport/logistiek vragen, NIET voor CMR of papieren." | `transportStatus === 'onderweg'` |
| `get_import_overview` | "Volledig import overzicht: betaling, ophalen, transport, documenten, RDW, BPM status." | Alle import-fases |

Handler functie `handleMarcoToolCall()` die dezelfde businesslogica gebruikt als `MarcoDashboard.tsx`:
- CMR pending: aangekomen + `cmrSent !== true` + niet trade-in/loan car
- Missing papers: aangekomen + `papersReceived !== true` + niet trade-in
- Resultaat gesorteerd op dagen (langst wachtend bovenaan)
- Per voertuig: merk, model, kenteken, leverancier, dagen sinds aankomst

---

**Stap 4 — Logging aanpassen**

- `console.log` en `ai_sales_interactions.agent_name` dynamisch maken op basis van `agentData.name`
- Niet meer hardcoded 'jacob_ceo'

### Technisch overzicht

| Wijziging | Regels | Impact |
|-----------|--------|--------|
| Agent prompt laden | 263-298 | Alle agents gebruiken hun eigen system_prompt |
| Tool loop fix | 340-389 | Geen tussentekst meer, altijd finale analyse |
| Marco tools | Nieuw blok | CMR en papieren correct beantwoord |
| Agent-specifieke tool selectie | 300-304 | Marco krijgt Marco-tools, Alex krijgt CEO-tools |
| Logging fix | 265, 410 | Correcte agent naam in logs |

### Verwacht resultaat
- "Welke auto's moeten we nog CMR versturen?" → Marco noemt specifieke auto's met leverancier en dagen
- "Welke auto's missen nog papieren?" → Concrete lijst gesorteerd op urgentie  
- "Welke auto's zijn nog onderweg?" → Transport overzicht (andere tool)
- Alle agents (Marco, Lisa, Daan, Sara, Alex) praten in hun eigen stijl

