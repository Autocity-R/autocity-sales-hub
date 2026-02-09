

# Plan: QR Code Sticker met DYMO Label V.8 Integratie

## Samenvatting

Een simpele QR code sticker met DYMO LabelWriter integratie. De sticker bevat alleen: QR Code, Merk, Model, Kleur, Kenteken en VIN. Printen gaat direct naar de DYMO printer zonder print dialoog.

## DYMO Label V.8 Integratie

De DYMO Connect Framework JavaScript SDK werkt met DYMO Label v8 software:

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Browser (React App)                                       │
│   └─> dymo.connect.framework.js                             │
│       └─> Lokale Web Service (localhost:41951)              │
│           └─> DYMO Label v8 Software                        │
│               └─> DYMO LabelWriter Printer                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Vereisten op de werkplek:**
- DYMO Label v8 software geinstalleerd en actief
- DYMO LabelWriter printer aangesloten
- DYMO Web Service draait automatisch op de achtergrond

## Sticker Design (Definitief)

```text
┌─────────────────────────────┐
│                             │
│    ┌────────────────┐       │
│    │  ░░░░░░░░░░░░  │       │
│    │  ░░ QR CODE ░  │       │
│    │  ░░░░░░░░░░░░  │       │
│    └────────────────┘       │
│                             │
│    Volkswagen Golf          │
│    Zwart                    │
│                             │
│    ┌─────────────────────┐  │
│    │     XX-123-YY       │  │
│    └─────────────────────┘  │
│                             │
│    VIN: WVWZZZ3CZWE123456   │
│                             │
└─────────────────────────────┘
```

**Geschikt voor DYMO labels:**
- 30323 Shipping Labels (54x101mm) - Aanbevolen
- 30256 Large Shipping (59x102mm)
- 30252 Address Labels (28x89mm) - Compact

## Technische Implementatie

### DYMO Framework Integratie

De DYMO Connect Framework wordt geladen via CDN en communiceert met de lokale DYMO Web Service:

```typescript
// Service: src/services/dymoService.ts

// Initialize DYMO Framework
export const initDymo = async (): Promise<boolean> => {
  try {
    await dymo.label.framework.init();
    const env = await dymo.label.framework.checkEnvironment();
    return env.isWebServicePresent && env.isFrameworkInstalled;
  } catch {
    return false;
  }
};

// Get available DYMO printers
export const getDymoPrinters = async (): Promise<string[]> => {
  const printers = await dymo.label.framework.getPrinters();
  return printers
    .filter(p => p.printerType === 'LabelWriterPrinter')
    .map(p => p.name);
};

// Print label directly to DYMO printer
export const printLabel = async (
  printerName: string, 
  labelXml: string
): Promise<void> => {
  await dymo.label.framework.printLabel(printerName, '', labelXml, '');
};
```

### Label XML Template

DYMO labels worden gedefinieerd in XML formaat:

```xml
<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Landscape</PaperOrientation>
  <Id>Shipping</Id>
  <PaperName>30323 Shipping</PaperName>
  <DrawCommands>
    <!-- QR Code -->
    <BarcodeObject>
      <Type>QRCode</Type>
      <Text>{checklistUrl}</Text>
    </BarcodeObject>
    
    <!-- Merk Model -->
    <TextObject>
      <Text>{brand} {model}</Text>
    </TextObject>
    
    <!-- Kleur -->
    <TextObject>
      <Text>{color}</Text>
    </TextObject>
    
    <!-- Kenteken (groot) -->
    <TextObject>
      <Text>{licensePlate}</Text>
      <FontSize>24</FontSize>
    </TextObject>
    
    <!-- VIN -->
    <TextObject>
      <Text>VIN: {vin}</Text>
    </TextObject>
  </DrawCommands>
</DieCutLabel>
```

### Nieuwe Database Tabel

```sql
CREATE TABLE checklist_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index voor snelle token lookups
CREATE INDEX idx_checklist_tokens_token ON checklist_access_tokens(token);

-- RLS policies
ALTER TABLE checklist_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can validate tokens"
  ON checklist_access_tokens FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tokens"
  ON checklist_access_tokens FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
```

### Nieuwe Bestanden

| Bestand | Beschrijving |
|---------|--------------|
| `src/pages/ChecklistView.tsx` | Publieke mobiele checklist pagina |
| `src/services/checklistAccessService.ts` | Token generatie en validatie |
| `src/services/dymoService.ts` | DYMO printer integratie |
| `src/components/inventory/ChecklistQRDialog.tsx` | Print dialog met printer selectie |

### Bestaande Bestanden Wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `index.html` | DYMO Connect Framework script toevoegen |
| `src/App.tsx` | Route `/checklist/view/:token` toevoegen |
| `src/components/inventory/detail-tabs/ChecklistTab.tsx` | "Print QR Sticker" knop |

## Print Dialog UI

```text
┌─────────────────────────────────────────────┐
│  Print QR Sticker                       X   │
├─────────────────────────────────────────────┤
│                                             │
│  DYMO Printer:  [▼ DYMO LabelWriter 450  ]  │
│  Label Formaat: [▼ 30323 Shipping        ]  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │        [QR CODE PREVIEW]            │    │
│  │                                     │    │
│  │        Volkswagen Golf              │    │
│  │        Zwart                        │    │
│  │                                     │    │
│  │        ┌─────────────────────┐      │    │
│  │        │     XX-123-YY       │      │    │
│  │        └─────────────────────┘      │    │
│  │                                     │    │
│  │        VIN: WVWZZZ3CZWE123456       │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ⚠️ DYMO Label software moet actief zijn    │
│                                             │
│         [Annuleren]    [🖨️ Printen]         │
│                                             │
└─────────────────────────────────────────────┘
```

## Fallback: Browser Print

Als DYMO niet beschikbaar is, bieden we een browser print fallback:

```text
┌─────────────────────────────────────────────┐
│  Print QR Sticker                       X   │
├─────────────────────────────────────────────┤
│                                             │
│  ⚠️ Geen DYMO printer gevonden              │
│                                             │
│  Zorg dat:                                  │
│  • DYMO Label v8 software actief is         │
│  • LabelWriter printer is aangesloten       │
│                                             │
│  [🔄 Opnieuw zoeken]                        │
│                                             │
│  ─────────── OF ───────────                 │
│                                             │
│  [🖨️ Print via browser (A4)]               │
│                                             │
└─────────────────────────────────────────────┘
```

## Automatische Verval

De gescande link verloopt automatisch wanneer de auto niet meer status `verkocht_b2c` heeft:

```typescript
// In ChecklistView.tsx
const vehicle = await fetchVehicleByToken(token);

if (vehicle.status !== 'verkocht_b2c') {
  return (
    <ErrorScreen 
      title="Link Verlopen"
      message="Dit voertuig is inmiddels afgeleverd."
    />
  );
}
```

## Bestandswijzigingen Overzicht

| Actie | Bestand |
|-------|---------|
| **Database** | Nieuwe tabel `checklist_access_tokens` |
| **Nieuw** | `src/pages/ChecklistView.tsx` |
| **Nieuw** | `src/services/checklistAccessService.ts` |
| **Nieuw** | `src/services/dymoService.ts` |
| **Nieuw** | `src/components/inventory/ChecklistQRDialog.tsx` |
| **Wijzig** | `index.html` (DYMO script) |
| **Wijzig** | `src/App.tsx` (route) |
| **Wijzig** | `src/components/inventory/detail-tabs/ChecklistTab.tsx` (knop) |

## Verwacht Resultaat

1. "Print QR Sticker" knop in Checklist tab
2. Dialog met DYMO printer selectie
3. Direct printen naar DYMO LabelWriter (geen print dialoog)
4. Sticker bevat alleen: QR, Merk/Model, Kleur, Kenteken, VIN
5. Mobiele pagina na scannen met volledige info + realtime checklist
6. Link verloopt automatisch bij status naar "afgeleverd"
7. Fallback naar browser print als DYMO niet beschikbaar is

