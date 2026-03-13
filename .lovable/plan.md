

# Fix: CMR datum niet zichtbaar na versturen

## Probleem

De CMR status (`cmrSent: true` + `cmrDate`) wordt correct in de database geschreven door `emailTemplateService.ts` (regel 494-531). Maar de UI ververst niet omdat de **query cache niet wordt ge-invalideerd** na het verzenden.

Beide paden (dropdown menu EN de knop in het documenten-tabblad) lopen via dezelfde `sendEmailMutation` in `Inventory.tsx` — en die doet in `onSuccess` alleen een toast, geen `queryClient.invalidateQueries`.

## Oplossing

### 1. `src/pages/Inventory.tsx` — sendEmailMutation onSuccess (regel 222-226)

Voeg cache invalidatie toe:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  queryClient.invalidateQueries({ queryKey: ['transportVehicles'] });
  toast({
    title: "Email verzonden",
    description: "De email is succesvol verzonden",
  });
},
```

### 2. `src/pages/Transport.tsx` — emailMutation onSuccess

Voeg `["vehicles"]` toe aan de bestaande invalidatie zodat ook vanuit Transport de Inventory cache ververst wordt.

Dat is alles — beide paden (dropdown + documenten-knop) gaan via dezelfde mutation, dus met deze ene fix werken beide.

