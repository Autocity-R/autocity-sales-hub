

## Lisa Dagplanning — Checklist Fix + Email Notificaties + Dynamische Sender

### Samenvatting
Drie bestanden bouwen/aanpassen. Checklist-logica fixen (auto's zonder checklist niet als "klaar" tellen), email notificaties toevoegen, en process-email-queue dynamisch maken qua sender.

---

### 1. `supabase/functions/lisa-dagplanning/index.ts` — Edit

**Checklist fix (regel 208):**
```
// Huidig (fout):
isChecklistComplete = checklist.length === 0 || openItems.length === 0
// Nieuw (correct):
hasChecklist = checklist.length > 0
isChecklistComplete = hasChecklist && openItems.length === 0
```

Auto's zonder checklist (`checklist.length === 0`) worden een aparte categorie: `checklistOntbreekt`. Deze komen NIET in `verkopersBellen`.

**Verkopers Bellen filter wordt:**
```
isRegistered && hasChecklist && isChecklistComplete && !hasAppointment
```

**Overzicht tab:** extra rij "⚠️ Checklist ontbreekt" met telling.

**Profiles ophalen uit database** i.p.v. hardcoded `PROFILES_MAP`:
```typescript
const { data: profiles } = await supabase.from('profiles').select('id, email, first_name, last_name');
```
Dit geeft verkoper emails voor de email flows.

**Email 1: Lloyd dagplanning (na Excel upload):**
Insert in `email_queue` met:
- `senderEmail: "aftersales@auto-city.nl"`
- `to: ["lloyd@auto-city.nl"]`
- `subject: "Dagplanning Aftersales — [datum]"`
- `htmlBody`: korte HTML samenvatting met aantallen + download link (signed URL)

**Email 2: Verkoper notificaties — klaar voor aflevering:**
Per verkoper die auto's heeft in `verkopersBellen`, insert in `email_queue`:
- `senderEmail: "aftersales@auto-city.nl"`
- `to: [verkoper.email]` (uit profiles tabel)
- `subject: "Aftersales: [N] auto('s) klaar voor aflevering"`
- `htmlBody`: HTML lijst met auto's die klaar zijn, verzoek om klant te bellen

---

### 2. `supabase/functions/lisa-email-checklist-reminder/index.ts` — Nieuw

Wordt aangeroepen door bestaande cron `lisa-checklist-reminder-10u` (ma-vr 08:00 UTC = 10:00 CET).

Logica:
1. Haal `verkocht_b2c` voertuigen op waar `preDeliveryChecklist` leeg is of niet bestaat
2. Groepeer per verkoper (`sold_by_user_id`)
3. Haal verkoper emails uit `profiles` tabel
4. Per verkoper: insert in `email_queue` met:
   - `senderEmail: "aftersales@auto-city.nl"`
   - `to: [verkoper.email]`
   - `subject: "Aftersales: checklist ontbreekt voor [N] auto('s)"`
   - `htmlBody`: HTML lijst auto's zonder checklist, verzoek om in te vullen

Toevoegen aan `supabase/config.toml`:
```toml
[functions.lisa-email-checklist-reminder]
verify_jwt = false
```

---

### 3. `supabase/functions/process-email-queue/index.ts` — Edit

**Dynamische sender impersonation:**

Huidige code (regel 29):
```typescript
const userToImpersonate = 'inkoop@auto-city.nl';
```

Wordt aangepast: `createJWTAssertion` en `getAccessToken` accepteren een `senderEmail` parameter. Per email in de queue wordt de juiste sender gebruikt.

Omdat verschillende senders verschillende OAuth tokens nodig hebben, wordt een token cache per sender bijgehouden:
```typescript
const tokenCache: Record<string, string> = {};

async function getAccessTokenForSender(serviceAccount, senderEmail): Promise<string> {
  if (tokenCache[senderEmail]) return tokenCache[senderEmail];
  const token = await getAccessToken(serviceAccount, senderEmail);
  tokenCache[senderEmail] = token;
  return token;
}
```

Fallback: `payload.senderEmail ?? 'inkoop@auto-city.nl'`

---

### Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/lisa-dagplanning/index.ts` | Edit — checklist fix + Lloyd email + verkoper emails |
| `supabase/functions/lisa-email-checklist-reminder/index.ts` | Nieuw — checklist reminder emails |
| `supabase/functions/process-email-queue/index.ts` | Edit — dynamische senderEmail |
| `supabase/config.toml` | Edit — lisa-email-checklist-reminder registreren |

### Niet nodig (al klaar in Supabase)
- Storage bucket `lisa-planningen` ✅
- Cron `lisa-dagplanning-08u` ✅
- Cron `lisa-checklist-reminder-10u` ✅

