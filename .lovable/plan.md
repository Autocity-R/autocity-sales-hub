

# Plan: BPM Rapport Opgestuurd Vinkje Toevoegen

## Overzicht

Een nieuw vinkje "BPM Rapport opgestuurd" toevoegen aan het voertuigen details menu, met datum tracking. Dit helpt voorkomen dat auto's blijven hangen in het import proces.

## Locatie in UI

Het vinkje komt tussen "Showroom online" en "CMR verstuurd" op de rechterkant van het voertuigen details scherm.

**Huidige volgorde:**
1. BPM Huys aangemeld
2. Showroom online
3. CMR verstuurd ← **NIEUW: BPM Rapport opgestuurd hier tussenvoegen**
4. Papieren binnen

**Nieuwe volgorde:**
1. BPM Huys aangemeld
2. Showroom online
3. **BPM Rapport opgestuurd** (NIEUW)
4. CMR verstuurd
5. Papieren binnen

## Technische Implementatie

### 1. TypeScript Type Uitbreiding

**Bestand:** `src/types/inventory.ts`

Nieuwe velden toevoegen aan het `Vehicle` interface:
```typescript
interface Vehicle {
  // ... bestaande velden
  bpmReportSent: boolean;      // Vinkje: BPM rapport opgestuurd
  bpmReportSentDate: Date | null;  // Datum wanneer verstuurd
}
```

### 2. UI Component Update

**Bestand:** `src/components/inventory/detail-tabs/DetailsTab.tsx`

Een nieuwe sectie toevoegen na "Showroom online" en voor "CMR verstuurd":

```typescript
{/* BPM Rapport Opgestuurd - NIEUW */}
<div className="space-y-2">
  <div className="flex items-center space-x-2">
    <Checkbox
      id="bpmReportSent"
      checked={editedVehicle.bpmReportSent}
      onCheckedChange={(checked) => 
        handleChange('bpmReportSent', Boolean(checked))
      }
      disabled={readOnly}
    />
    <Label htmlFor="bpmReportSent">BPM Rapport opgestuurd</Label>
  </div>
  
  {editedVehicle.bpmReportSent && (
    <div className="ml-6 mt-2">
      {/* Datum picker - zelfde stijl als CMR */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {editedVehicle.bpmReportSentDate 
              ? format(editedVehicle.bpmReportSentDate, "PPP", { locale: nl }) 
              : "Selecteer datum"}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="single"
            selected={editedVehicle.bpmReportSentDate}
            onSelect={(date) => handleChange('bpmReportSentDate', date)}
          />
        </PopoverContent>
      </Popover>
    </div>
  )}
</div>
```

### 3. Service Layer Update

**Bestand:** `src/services/supabaseInventoryService.ts`

De nieuwe velden toevoegen aan de opslag/ophaal logica:

```typescript
// Bij opslaan naar database (details JSONB):
bpmReportSent: vehicle.bpmReportSent ?? false,
bpmReportSentDate: vehicle.bpmReportSentDate?.toISOString() ?? null,

// Bij ophalen uit database:
bpmReportSent: details.bpmReportSent || false,
bpmReportSentDate: details.bpmReportSentDate ? new Date(details.bpmReportSentDate) : null,
```

### 4. Andere Services Updaten

**Bestanden:**
- `src/services/deliveredVehicleService.ts` - Mapping voor afgeleverde voertuigen
- `src/hooks/useVehicleDetailDialog.ts` - Dialog hook mapping
- `src/components/inventory/VehicleForm.tsx` - Formulier voor nieuwe voertuigen

## Bestandswijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/types/inventory.ts` | Nieuwe velden: `bpmReportSent`, `bpmReportSentDate` |
| `src/components/inventory/detail-tabs/DetailsTab.tsx` | UI checkbox met datum picker toevoegen |
| `src/services/supabaseInventoryService.ts` | Mapping voor opslag/ophaal |
| `src/services/deliveredVehicleService.ts` | Mapping voor afgeleverde voertuigen |
| `src/hooks/useVehicleDetailDialog.ts` | Mapping in dialog hook |
| `src/components/inventory/VehicleForm.tsx` | Initiële waarden voor nieuwe voertuigen |

## Geen Database Migratie Nodig

De velden worden opgeslagen in het bestaande `details` JSONB veld, dus er is geen database schema wijziging nodig.

## Verwacht Resultaat

Na implementatie:
- Nieuw vinkje "BPM Rapport opgestuurd" zichtbaar tussen Showroom online en CMR verstuurd
- Bij aanvinken verschijnt een datum picker
- Datum wordt automatisch opgeslagen
- Overzicht welke auto's BPM rapport verstuurd hebben en wanneer

