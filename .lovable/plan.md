

# Fix: Taken niet zichtbaar op iPad (Safari)

## Oorzaak

Het probleem is hoogstwaarschijnlijk een **Safari-specifiek auth sessie probleem**. Safari op iPad blokkeert third-party cookies via ITP (Intelligent Tracking Prevention), waardoor de Supabase auth sessie soms niet correct wordt hersteld. Als de `user` null blijft, wordt de taken-query niet uitgevoerd en ziet de gebruiker een lege pagina.

Extra probleem: wanneer de fetch mislukt, wordt de fout stil opgeslikt en een lege array geretourneerd, waardoor het lijkt alsof er gewoon geen taken zijn.

## Aanpak

### 1. Debug logging toevoegen aan TaskManagement.tsx

Voeg console.log statements toe zodat we bij het volgende probleem direct kunnen zien wat er mis gaat:
- Log de `user` status, `loading` status, en het aantal taken
- Log of de query daadwerkelijk wordt uitgevoerd

### 2. Betere foutafhandeling in fetchTasks (taskService.ts)

- Log een duidelijke waarschuwing als de Supabase sessie ontbreekt voordat de query wordt uitgevoerd
- Controleer actief of er een sessie is via `supabase.auth.getSession()` en log het resultaat

### 3. Retry mechanisme toevoegen voor auth-sessie

In TaskManagement.tsx:
- Als `user` null is maar `loading` false, probeer de sessie handmatig te herstellen via `supabase.auth.getSession()`
- Voeg een `retry` optie toe aan de React Query config zodat het bij een fout automatisch opnieuw probeert

### 4. Visuele feedback bij lege taken

In plaats van een stille lege lijst, toon een duidelijke melding met een "Probeer opnieuw" knop als er geen taken zichtbaar zijn, zodat de gebruiker zelf kan herladen.

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/TaskManagement.tsx` | Debug logging, retry logica, visuele feedback bij lege state |
| `src/services/taskService.ts` | Sessie-check voor fetch, betere error logging |
| `src/contexts/AuthContext.tsx` | Sessie-herstel mechanisme voor Safari/iOS |

## Verwacht resultaat

- Als de sessie verlopen is, wordt deze automatisch hersteld
- Als er een probleem is, ziet de gebruiker een duidelijke melding met een "Probeer opnieuw" knop
- Console logs helpen bij toekomstige debugging van vergelijkbare problemen

