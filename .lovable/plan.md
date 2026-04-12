

## Plan: Marco BPM Huys — volledig bouwen

### Overzicht
Bouw twee edge functions (dagelijkse check + weekoverzicht), een BPM Huys dashboard tab, en een handmatig invoerformulier. Database tabellen bestaan al. Meldcode koppeling altijd via `RIGHT(vin, 4)`.

---

### 1. Fix `bpmRequestedDate` bij aanmelding

**Bestand**: `src/services/emailTemplateService.ts` (regel 473-476)

Voeg `bpmRequestedDate` toe wanneer `bpmRequested` op `true` wordt gezet:
```typescript
const updatedDetails = {
  ...currentDetails,
  bpmRequested: true,
  bpmRequestedDate: new Date().toISOString()
};
```

---

### 2. Edge Function: `marco-bpm-check`

**Bestand**: `supabase/functions/marco-bpm-check/index.ts` (nieuw)

Dagelijkse check (ma-vr 08:00 CET) met twee regels:

- **Regel 1**: Vehicles met `bpmRequested=true` + `bpmRequestedDate > 7 dagen` zonder `auto_opgenomen` in `bpm_huys_whatsapp_log` → email alert
- **Regel 3**: Vehicles met `papieren_verstuurd` in whatsapp_log maar na 3 dagen nog geen `aanvraag_ontvangen` import_status → email alert

Emails via `email_queue` insert met `senderEmail: 'marco@auto-city.nl'`, `to: 'hendrik@auto-city.nl'`, `htmlBody`.

Queries gebruiken `RIGHT(vin, 4)` voor meldcode matching, nooit LIKE.

---

### 3. Edge Function: `marco-bpm-weekoverzicht`

**Bestand**: `supabase/functions/marco-bpm-weekoverzicht/index.ts` (nieuw)

Maandag 09:00 CET. Genereert HTML email met 4 blokken:
1. Wacht op opname (bpmRequested=true, geen auto_opgenomen)
2. Actie vereist door ons (opgenomen, geen papieren_verstuurd)
3. Wacht op RDW aanmelding (papieren_verstuurd, <3 dagen)
4. Vastgelopen (papieren_verstuurd, >3 dagen, geen statusupdate)

---

### 4. Dashboard: `BpmHuysTab.tsx`

**Bestand**: `src/components/ai-agents/dashboards/BpmHuysTab.tsx` (nieuw)

4 secties:

| Sectie | Inhoud |
|--------|--------|
| Actie vereist door ons (oranje) | Opgenomen door BPM Huys maar papieren nog niet verstuurd |
| Wacht op BPM Huys (rood) | Aangemeld >7d zonder opname + papieren >3d zonder RDW |
| In behandeling | Alle actieve vehicles met bpmRequested=true |
| Handmatig invoer | Meldcode (4 cijfers) → `RIGHT(vin, 4)` lookup + bpmRequested=true. Dropdown: Auto opgenomen / Papieren verstuurd. Opslaan → INSERT `bpm_huys_whatsapp_log` |

---

### 5. MarcoDashboard.tsx — Tab navigatie

**Bestand**: `src/components/ai-agents/dashboards/MarcoDashboard.tsx` (edit)

Tabs toevoegen: **Pipeline** | **BPM Huys**. Default = Pipeline (huidige view). BPM Huys tab rendert `<BpmHuysTab />`.

---

### 6. Config registratie

**Bestand**: `supabase/config.toml` (edit)

```toml
[functions.marco-bpm-check]
verify_jwt = false

[functions.marco-bpm-weekoverzicht]
verify_jwt = false
```

---

### 7. Cron jobs (via SQL insert tool, niet migratie)

Twee cron jobs met service_role key:
- `marco-bpm-dagcheck-08u`: `0 6 * * 1-5` (08:00 CET)
- `marco-bpm-weekoverzicht`: `0 7 * * 1` (09:00 CET maandag)

---

### Bestanden samenvatting

| Bestand | Actie |
|---------|-------|
| `src/services/emailTemplateService.ts` | `bpmRequestedDate` toevoegen |
| `supabase/functions/marco-bpm-check/index.ts` | Nieuw |
| `supabase/functions/marco-bpm-weekoverzicht/index.ts` | Nieuw |
| `src/components/ai-agents/dashboards/BpmHuysTab.tsx` | Nieuw |
| `src/components/ai-agents/dashboards/MarcoDashboard.tsx` | Edit — tabs |
| `supabase/config.toml` | Edit — 2 functies |
| Cron jobs | Via SQL insert tool |

### Niet bouwen
- Database tabellen (staan al)
- Baileys WhatsApp koppeling (later)
- Factuurverwerking via email (later)

