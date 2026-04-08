

## Fix: Daan Dashboard blank screen — 2 bugs

### Probleem 1: Auto-analyse op page load
De B2B kansen query (`useQuery`) roept de edge function aan met `mode: "download"` **bij elke page load**. Dit triggert de volledige analyse (Claude + 47 JP Cars queries = 30+ seconden). Dit veroorzaakt:
- Timeout / blank screen
- Onnodige API kosten bij elke keer dat je het dashboard opent

**Fix:** De `useQuery` voor B2B kansen moet `enabled: false` zijn — data wordt alleen geladen wanneer je handmatig op "Analyse" klikt. Na de analyse worden de resultaten in state bewaard.

### Probleem 2: Interface mismatch
De dashboard `B2BKans` interface gebruikt **oude veldnamen** die niet meer bestaan:
- `auto`, `kenteken`, `b2bAanbodprijs`, `dealerNaam`, `dealerVerkoopprijs`, `dealerStagedagen`, `verkochtDagenGeleden`, `onzeMarge`, `dealerMargeruimte`

De edge function retourneert nu **nieuwe veldnamen**:
- `onze_merk`, `onze_model`, `onze_vin`, `dealer_naam`, `dealer_prijs`, `dealer_stagedagen`, `verkocht_dgn_geleden`, `onze_marge`, `b2b_aanbod`, `jp_cars_url`

De `KansenTabel` component rendert `k.auto`, `k.kenteken`, etc. — die zijn allemaal `undefined`.

**Fix:** Update de interface en `KansenTabel` naar de nieuwe veldnamen. Voeg ook de JP Cars link toe als klikbare kolom.

### Technische wijzigingen

**Bestand: `src/components/ai-agents/dashboards/DaanDashboard.tsx`**

1. Vervang `B2BKans` interface met nieuwe veldnamen
2. Verwijder de auto-loading `useQuery` voor B2B — gebruik `useState` + handmatige fetch
3. Update `KansenTabel` kolommen naar nieuwe velden + voeg JP Cars link kolom toe
4. "Analyse" knop slaat resultaten op in state
5. "Excel" knop gebruikt `excelUrl` uit het analyse resultaat (niet opnieuw aanroepen)

