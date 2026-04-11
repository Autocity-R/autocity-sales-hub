

## Plan: Fix Alex chat — routing + edge function crash

### Probleem 1: Chat routing stuurt Alex naar hendrik-ai-chat

**Oorzaak**: `useProductionAIChat` checkt of agent "Hendrik" is — Alex is dat niet, dus gaat Alex via `regularChat` → `useAIChatWebhook` → `hendrik-ai-chat`. Alex komt nooit bij `alex-ceo-chat`.

**Fix in `src/hooks/useAIChatWebhook.ts`** (regels 32-41):
- Na de Hendrik-check, voeg een Alex-check toe die naar `alex-ceo-chat` stuurt
- Alex detectie: `agentData?.name === 'Alex'` of agent ID === `b6000000-0000-0000-0000-000000000006`

```typescript
// Na isHendrikAgent check:
const isAlexAgent = agentData?.name === 'Alex';

if (isAlexAgent) {
  const { data: aiResponse, error: aiError } = await supabase.functions.invoke(
    'alex-ceo-chat',
    { body: { sessionId: session.id, message: content, agentId } }
  );
  // ... handle response
}
```

### Probleem 2: Edge function crasht op regel 66

**Oorzaak**: `supabase.rpc('', {}).catch()` — Supabase query builder heeft geen `.catch()` methode. Dit gooit `TypeError: supabase.rpc(...).catch is not a function`.

**Fix in `supabase/functions/alex-ceo-chat/index.ts`** (regel 66):
- Verwijder de kapotte `rpc('')` call volledig — de data wordt al via directe queries opgehaald op regels 69-72

```typescript
// Verwijder regel 66:
// const { data: kpiData } = await supabase.rpc('', {}).catch(() => ({ data: null }));
```

### Samenvatting

| Bestand | Actie |
|---------|-------|
| `src/hooks/useAIChatWebhook.ts` | Alex-specifieke routing naar `alex-ceo-chat` edge function |
| `supabase/functions/alex-ceo-chat/index.ts` | Verwijder kapotte `rpc('')` call (regel 66) |

### Verwacht resultaat
- Alex chat stuurt berichten naar `alex-ceo-chat` met geheugen + web search
- Edge function crasht niet meer
- Andere agents blijven ongewijzigd via `hendrik-ai-chat`

