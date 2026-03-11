

# Fix: CMR datum wordt niet opgeslagen bij verzenden

## Probleem
In `src/services/emailTemplateService.ts` lijn 514 wordt de datum opgeslagen als `cmrSentDate`, maar overal in de codebase wordt het veld gelezen als `cmrDate`. Hierdoor wordt het vinkje wel gezet (`cmrSent: true`) maar de datum verschijnt niet.

## Oplossing
Een simpele fix op 1 regel in `emailTemplateService.ts`:

**Lijn 514 wijzigen:**
```
cmrSentDate: new Date().toISOString()
```
wordt:
```
cmrDate: new Date().toISOString()
```

Dit zorgt ervoor dat wanneer een CMR email wordt verstuurd, zowel `cmrSent: true` als `cmrDate` correct worden opgeslagen in het `details` JSONB veld van het voertuig.

## Bestanden
- `src/services/emailTemplateService.ts` — 1 regel fix (lijn 514)

