

## Plan: Sara Garantie Tools toevoegen aan hendrik-ai-chat

### Samenvatting
Voeg 3 Sara-specifieke tools toe aan `hendrik-ai-chat/index.ts` zodat Sara garantieclaims kan opzoeken, op kenteken kan zoeken, en leenauto's kan bekijken. Gebruikt het bestaande Marco/Lisa patroon.

### Wijzigingen in `supabase/functions/hendrik-ai-chat/index.ts`

**1. Sara agent detectie (na regel 333)**
```typescript
const isSaraAgent = agentName.toLowerCase().includes('sara') ||
                    agentCapabilities.includes('warranty-tracking');
```

**2. Tool selectie (regel 335-344) — Sara toevoegen in if/else chain**
```typescript
if (isMarcoAgent) {
  agentTools = getMarcoTools();
} else if (isLisaAgent) {
  agentTools = getLisaTools();
} else if (isSaraAgent) {
  agentTools = getSaraTools();
} else if (isCEOAgent) {
  ...
```

**3. Tool handler routing (regel 401-413) — Sara toevoegen**
```typescript
if (isMarcoAgent) { ... }
if (isLisaAgent) { ... }
if (isSaraAgent) {
  return await handleSaraToolCall(supabaseClient, toolName, toolInput);
}
```

**4. Nieuwe functie `getSaraTools()` (na regel 2925)**

Drie tools:
- **`get_warranty_claims`** — Alle openstaande + recente (90 dagen) claims met vehicle join, garantiepakket, verkoper, en `data_bron` indicator (systeem/handmatig)
- **`get_claim_by_kenteken`** — Zoekt via BEIDE bronnen: `manual_license_number ILIKE` EN `v.license_number ILIKE`
- **`get_loan_cars`** — Leenauto's via `loan_cars` tabel gejoined met `vehicles` voor merk/model/kenteken

**5. Nieuwe functie `handleSaraToolCall()` (na getSaraTools)**

Queries:

`get_warranty_claims`:
```sql
SELECT wc.*, v.license_number as v_kenteken, v.brand as v_merk, v.model as v_model,
  v.details->>'warrantyPackage' as garantie_pakket,
  v.details->>'salespersonName' as verkoper,
  CASE WHEN wc.vehicle_id IS NOT NULL THEN 'systeem' ELSE 'handmatig' END as data_bron
FROM warranty_claims wc
LEFT JOIN vehicles v ON v.id = wc.vehicle_id
WHERE wc.claim_status = 'pending' OR wc.created_at > NOW() - INTERVAL '90 days'
ORDER BY wc.created_at DESC
```

`get_claim_by_kenteken` (zoekt beide bronnen):
```sql
SELECT wc.*, v.license_number as v_kenteken, v.brand as v_merk, v.model as v_model,
  v.details->>'warrantyPackage' as garantie_pakket,
  v.details->>'salespersonName' as verkoper,
  CASE WHEN wc.vehicle_id IS NOT NULL THEN 'systeem' ELSE 'handmatig' END as data_bron
FROM warranty_claims wc
LEFT JOIN vehicles v ON v.id = wc.vehicle_id
WHERE wc.manual_license_number ILIKE '%' || $kenteken || '%'
   OR v.license_number ILIKE '%' || $kenteken || '%'
ORDER BY wc.created_at DESC
```

`get_loan_cars`:
```sql
SELECT lc.id, lc.status, v.brand, v.model, v.license_number
FROM loan_cars lc
JOIN vehicles v ON v.id = lc.vehicle_id
ORDER BY lc.status, v.brand
```

Omdat we geen raw SQL via supabase client kunnen draaien, worden de queries geïmplementeerd via supabase JS client met `.from().select()` en filters. De `data_bron` wordt in JavaScript berekend op basis van `vehicle_id !== null`.

### Wat NIET verandert
- Marco tools, Lisa tools, CEO tools — ongewijzigd
- Database — geen wijzigingen nodig

| Bestand | Actie |
|---------|-------|
| `supabase/functions/hendrik-ai-chat/index.ts` | Sara detectie + tool selectie + getSaraTools + handleSaraToolCall |

