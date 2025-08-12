# Google Sheets Integratie Setup

## Overzicht
Deze handleiding legt uit hoe je de automatische synchronisatie tussen Google Sheets en het CRM systeem configureert voor voertuig importstatussen.

## Webhook URL
Je webhook endpoint is beschikbaar op:
```
https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/sheets-import-webhook
```

## Google Apps Script Setup

### Stap 1: Open je Google Sheets
1. Ga naar je Google Sheets: https://docs.google.com/spreadsheets/d/1lbW4PR6wHEsD16cTxFbfNrD7w4I0_W8I1P2zYl7N-_0/edit
2. Klik op **Extensions** > **Apps Script**

### Stap 2: Vervang de standaard code met:

```javascript
// Webhook URL van je CRM systeem
const WEBHOOK_URL = 'https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/sheets-import-webhook';

// Kolom configuratie (pas aan naar jouw sheet opzet)
const COLUMNS = {
  VIN: 1,           // Kolom A
  KENTEKEN: 2,      // Kolom B
  IMPORT_STATUS: 4, // Kolom D (pas aan naar jouw status kolom)
  ROW_NUMBER: 'ROW' // Automatisch bepaald
};

// Status mapping (voeg toe of wijzig naar jouw statussen)
const VALID_STATUSES = [
  'Niet gestart',
  'Aangemeld', 
  'Goedgekeurd',
  'Transport geregeld',
  'Onderweg',
  'Aangekomen',
  'Afgemeld',
  'BPM betaald',
  'Herkeuring',
  'Ingeschreven'
];

function onEdit(e) {
  try {
    // Check of de wijziging in de import status kolom is
    if (e.range.getColumn() !== COLUMNS.IMPORT_STATUS) {
      return;
    }

    // Skip header row
    if (e.range.getRow() === 1) {
      return;
    }

    const sheet = e.source.getActiveSheet();
    const row = e.range.getRow();
    const newStatus = e.range.getValue();

    // Valideer status
    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      console.log('Invalid status:', newStatus);
      return;
    }

    // Haal vehicle identifiers op
    const vin = sheet.getRange(row, COLUMNS.VIN).getValue();
    const kenteken = sheet.getRange(row, COLUMNS.KENTEKEN).getValue();

    // Prepare payload
    const payload = {
      import_status: newStatus,
      external_reference: `row_${row}`,
      row_number: row
    };

    // Voeg VIN toe als beschikbaar
    if (vin) {
      payload.vin = vin.toString().trim();
    }

    // Voeg kenteken toe als beschikbaar
    if (kenteken) {
      payload.license_number = kenteken.toString().trim();
    }

    // Verstuur naar webhook
    sendToWebhook(payload, row);

  } catch (error) {
    console.error('Error in onEdit:', error);
    // Optioneel: voeg error logging toe in specifieke cel
  }
}

function sendToWebhook(payload, row) {
  try {
    const options = {
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json',
      },
      'payload': JSON.stringify(payload)
    };

    console.log('Sending to webhook:', payload);
    
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseText = response.getContentText();
    const statusCode = response.getResponseCode();

    console.log('Webhook response:', statusCode, responseText);

    if (statusCode === 200) {
      // Succes - optioneel: markeer cel groen of voeg timestamp toe
      console.log('Status update successful for row', row);
    } else {
      // Error - optioneel: markeer cel rood of voeg error message toe
      console.error('Webhook error:', statusCode, responseText);
    }

  } catch (error) {
    console.error('Error sending to webhook:', error);
    // Optioneel: implementeer retry logic
  }
}

// Test functie om handmatig te testen
function testWebhook() {
  const testPayload = {
    vin: 'TEST123456789',
    import_status: 'Aangemeld',
    external_reference: 'test_row',
    row_number: 999
  };
  
  sendToWebhook(testPayload, 999);
}
```

### Stap 3: Configuratie aanpassen
1. **Pas de COLUMNS configuratie aan** naar jouw sheet opzet
2. **Update VALID_STATUSES** met jouw exacte status namen
3. **Test de integratie** met de `testWebhook()` functie

### Stap 4: Opslaan en autorisatie
1. Klik **Save** (Ctrl+S)
2. Run de `testWebhook` functie eenmaal om autorisaties te configureren
3. Geef toestemming voor URL toegang

## Sheet Opzet Suggestie

| A (VIN) | B (Kenteken) | C (Merk/Model) | D (Import Status) | E (Sync Status) |
|---------|--------------|----------------|-------------------|-----------------|
| VIN123  | XX-XXX-1     | BMW X5         | Aangemeld         | ✅ Synced       |
| VIN124  | YY-YYY-2     | Audi A4        | Onderweg          | ✅ Synced       |

## Status Mapping
De volgende statussen worden ondersteund:

- **Niet gestart** → `niet_gestart`
- **Aangemeld** → `aangemeld`  
- **Goedgekeurd** → `goedgekeurd`
- **Transport geregeld** → `transport_geregeld`
- **Onderweg** → `onderweg`
- **Aangekomen** → `aangekomen`
- **Afgemeld** → `afgemeld`
- **BPM betaald** → `bpm_betaald`
- **Herkeuring** → `herkeuring`
- **Ingeschreven** → `ingeschreven`

## Troubleshooting

### Script werkt niet:
1. Check of je de juiste kolom nummers hebt ingesteld
2. Controleer of de status exact overeenkomt met VALID_STATUSES
3. Bekijk de Apps Script logs (View > Logs)

### Webhook errors:
1. Test de webhook URL handmatig
2. Check of VIN of kenteken correct zijn
3. Controleer of voertuig bestaat in database

### Autorisatie problemen:
1. Run `testWebhook()` functie eenmaal
2. Geef toestemming voor externe URL toegang
3. Herlaad de sheet en probeer opnieuw

## Monitoring
- Alle status wijzigingen worden gelogd in de `vehicle_import_logs` tabel
- Check het CRM dashboard voor real-time status updates
- Apps Script logs tonen webhook responses