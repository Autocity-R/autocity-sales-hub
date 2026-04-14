

## Plan: Agent Memory voor alle 5 agents

### 1. Edge Function: `hendrik-ai-chat/index.ts`

**Memory laden (na regel ~295, vóór de Claude call)**:
- Voor alle agents behalve CEO (die heeft al eigen memory):
- Query `agent_memory` met `agent_name = agentName`, `actief = true`, max 20, `order('updated_at', desc)`
- Bouw context blok: `\nWAT IK AL WEET (mijn geheugen):\n[TYPE] onderwerp: inhoud`
- Voeg toe aan `contextPrompt` (regel ~321-325, naast de bestaande CEO memory check)

**Memory opslaan (na regel ~509, non-blocking)**:
- Na de response, voor alle agents behalve CEO:
- Async functie `saveAgentMemory(supabase, agentName, message, responseMessage)`:
  - Tweede Claude call met spaarzame prompt: alleen opslaan bij correcties, werkwijze, voorkeuren, uitzonderingen
  - JSON response: `{ "opslaan": boolean, "entries": [...] }`
  - Insert in `agent_memory` als `opslaan === true`
- Aangeroepen als: `saveAgentMemory(...).catch(() => {})` — non-blocking

### 2. Edge Function: `kevin-ai-chat/index.ts`

Zelfde logica:
- **Laden**: na regel ~29, query `agent_memory` voor `agent_name = 'Kevin'`, voeg context toe aan user message
- **Opslaan**: na regel ~407, non-blocking `saveAgentMemory(...).catch(() => {})`

### 3. Nieuw component: `AgentMemoryTab.tsx`

`src/components/ai-agents/dashboards/AgentMemoryTab.tsx`:
- Props: `agentName: string`
- Query `agent_memory` waar `agent_name = agentName` en `actief = true`, gesorteerd op `updated_at desc`
- Tabel met: type badge (kleurgecodeerd), onderwerp, inhoud, datum
- "Deactiveer" knop per entry → update `actief = false`
- Lege state bij geen geheugen

### 4. Dashboard integratie

Voeg `<AgentMemoryTab>` toe in elk dashboard via een Tabs wrapper of sectie onderaan:
- `MarcoDashboard.tsx` → `<AgentMemoryTab agentName="Marco" />`
- `LisaDashboard.tsx` → `<AgentMemoryTab agentName="Lisa" />`
- `DaanDashboard.tsx` → `<AgentMemoryTab agentName="Daan" />`
- `KevinDashboard.tsx` → `<AgentMemoryTab agentName="Kevin" />`
- `SaraDashboard.tsx` → `<AgentMemoryTab agentName="Sara" />`

Alex wordt overgeslagen (heeft eigen memory systeem).

### Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/hendrik-ai-chat/index.ts` | Memory laden + non-blocking opslaan |
| `supabase/functions/kevin-ai-chat/index.ts` | Zelfde |
| `src/components/ai-agents/dashboards/AgentMemoryTab.tsx` | Nieuw component |
| 5 dashboard bestanden | AgentMemoryTab integreren |

### Technische details

- Memory extractie prompt is spaarzaam: alleen bij correcties, werkwijze, voorkeuren, uitzonderingen
- Non-blocking: `.catch(() => {})` zodat response nooit vertraagd wordt
- `agent_memory` tabel bestaat al — geen migratie nodig
- RLS staat al goed: authenticated kan lezen/updaten, service_role heeft full access

