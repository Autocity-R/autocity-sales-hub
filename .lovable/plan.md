

# Plan: Nieuw AI Team scherm — Database opschoning + volledig nieuwe UI

## Overzicht

De huidige AI Agents tab bevat 8 sub-tabs (Overzicht, Briefings, Robin, Hendrik, Chat, Agents, Webhooks, Beheer) met verouderde componenten. Dit wordt vervangen door één overzichtelijk AI Team scherm met 6 agent-kaarten, elk met een Dashboard en Chat tab.

---

## Stap 1: Database opschonen

Data-operatie via insert tool (geen migratie):
- Verwijder alle gerelateerde data (chat sessions, messages, memory, briefings, webhooks) van agents die NIET Marco/Lisa/Daan/Tom/Sara/Alex heten
- Verwijder vervolgens die agents zelf
- Insert 6 nieuwe agents met correcte persona, capabilities en data_access_permissions

**Let op**: Bestaande tabellen `ai_chat_sessions`, `ai_chat_messages`, `ai_memory`, `ai_briefings`, `ai_agent_webhooks` worden eerst opgeschoond voor verwijderde agents.

---

## Stap 2: Nieuwe pagina `AIAgents.tsx` — volledig herschrijven

Huidige 8-tab structuur wordt vervangen door:

**Header**: "AI Team" titel

**Agent selector**: Horizontale rij van 6 kaarten
- Elke kaart: avatar (initialen + kleur), naam, functietitel, groene "live" dot
- Geselecteerde agent: blauwe rand
- Kleuren: Marco=blauw, Lisa=groen, Daan=oranje, Tom=koraal, Sara=paars, Alex=donkerpaars

**Rol-gebaseerde filtering** via bestaande `useRoleAccess` hook + `userRole`:
- admin/owner → alle 6 agents
- manager → alle 6
- verkoper → alleen Daan
- operationeel → Marco, Tom, Lisa
- aftersales_manager → Lisa, Sara

**Per agent twee tabs**: Dashboard | Chat

---

## Stap 3: Agent dashboards (6 nieuwe componenten)

### `MarcoDashboard.tsx` — Import Monitor
- 8 tegels met import status-tellingen (query op `vehicles` WHERE `isTradeIn=false`, `isLoanCar IS NULL`, `status != 'afgeleverd'`)
- Rode alerts: goedgekeurd >7 dagen, bpm_betaald >5 dagen
- Oranje: aangekomen wacht >14 dagen

### `DaanDashboard.tsx` — Verkoopleider
- Totaal voorraad, voorraadwaarde, auto's >70 dagen online, 50-70 dagen waarschuwing
- Lijst langst staande auto's
- Auto's zonder online_since_date

### `LisaDashboard.tsx` — Afleverplanner
- Geplande afleveringen vandaag + 7 dagen
- Ingeschreven maar checklist incompleet
- Verkocht B2C zonder checklist

### `SaraDashboard.tsx` — Garantie Tracker
- Open claims totaal, gemiddelde doorlooptijd, claims >14 dagen alert
- Lijst open claims met klantgegevens

### `TomDashboard.tsx` — Transport Manager
- Auto's onderweg, aangekomen vandaag, B2B papieren verwacht
- Op basis van details.transportStatus en details.papersReceived

### `AlexDashboard.tsx` — CEO
- Samenvattingstegels van alle agents
- Totaal alerts (rood/oranje/groen)
- Dagelijkse briefing knop

---

## Stap 4: Chat per agent

Nieuwe component `AgentChat.tsx`:
- Hergebruikt bestaande chat-infrastructuur (`ai_chat_sessions`, `ai_chat_messages`)
- Systeem-prompt per agent met live Supabase data als context
- Scrollbaar gesprekshistorie, timestamps, agent naam boven antwoorden
- 4-6 snelknoppen per agent (veelgestelde vragen)
- Enter-toets + stuur-knop

---

## Stap 5: Navigatie bijwerken

In `Sidebar.tsx` en `AppSidebar.tsx`:
- Label wijzigen van "AI Agents" naar "AI Team"
- `hasAIAgentsAccess()` uitbreiden: niet meer alleen admin, maar rol-gebaseerd (alle rollen die minstens 1 agent mogen zien)

In `useRoleAccess.ts`:
- `hasAIAgentsAccess` aanpassen zodat verkoper, operationeel en aftersales_manager ook toegang krijgen (zij zien alleen hun eigen agents)

---

## Bestanden die wijzigen

| Bestand | Actie |
|---------|-------|
| `src/pages/AIAgents.tsx` | Volledig herschrijven |
| `src/hooks/useRoleAccess.ts` | `hasAIAgentsAccess` uitbreiden |
| `src/components/layout/Sidebar.tsx` | Label → "AI Team" |
| `src/components/layout/AppSidebar.tsx` | Label → "AI Team" |
| `src/components/ai-agents/AgentSelector.tsx` | **Nieuw** — horizontale kaarten |
| `src/components/ai-agents/dashboards/MarcoDashboard.tsx` | **Nieuw** |
| `src/components/ai-agents/dashboards/DaanDashboard.tsx` | **Nieuw** |
| `src/components/ai-agents/dashboards/LisaDashboard.tsx` | **Nieuw** |
| `src/components/ai-agents/dashboards/SaraDashboard.tsx` | **Nieuw** |
| `src/components/ai-agents/dashboards/TomDashboard.tsx` | **Nieuw** |
| `src/components/ai-agents/dashboards/AlexDashboard.tsx` | **Nieuw** |
| `src/components/ai-agents/AgentChat.tsx` | Herschrijven — per-agent chat |

### Bestanden die NIET verwijderd worden (voor nu)
Oude componenten (`AgentOverviewDashboard`, `HendrikBriefingDashboard`, `RobinCalendarDashboard`, etc.) worden niet meer geïmporteerd maar blijven bestaan voor eventuele referentie.

---

## Technische details

### Agent kleuren mapping
```typescript
const AGENT_COLORS = {
  Marco: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-500' },
  Lisa:  { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-500' },
  Daan:  { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-500' },
  Tom:   { bg: 'bg-red-400', border: 'border-red-400', text: 'text-red-400' },
  Sara:  { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-500' },
  Alex:  { bg: 'bg-purple-800', border: 'border-purple-800', text: 'text-purple-800' },
};
```

### Rol-naar-agent mapping
```typescript
const ROLE_AGENT_ACCESS: Record<string, string[]> = {
  admin: ['Marco','Lisa','Daan','Tom','Sara','Alex'],
  owner: ['Marco','Lisa','Daan','Tom','Sara','Alex'],
  manager: ['Marco','Lisa','Daan','Tom','Sara','Alex'],
  verkoper: ['Daan'],
  operationeel: ['Marco','Tom','Lisa'],
  aftersales_manager: ['Lisa','Sara'],
};
```

