

# Fix: Print-instructie aanpassen voor DYMO stickers

## Probleem

Het papierformaat "11354 Multi-Purpose" bestaat niet als optie in het browser-printvenster. De browser kent geen DYMO-specifieke formaatnamen -- die zijn alleen beschikbaar in de DYMO Label Software zelf.

## Oplossing

De print-instructie en aanpak aanpassen zodat het werkt ongeacht welk papierformaat de browser aanbiedt:

### 1. Print-instructie verduidelijken
De huidige tekst verwijst naar een formaat dat niet bestaat in de browser. Vervangen door praktische instructies:
- Kies papierformaat **"Custom"** of **"Aangepast"** (afhankelijk van de taal)
- Stel afmetingen in op **57 x 32 mm** (of **2.24 x 1.26 inch**)
- Zet marges op **Geen / None**
- Of: kies het **kleinste beschikbare formaat** en marges op Geen

### 2. Extra CSS-veiligheid toevoegen
- `@page { size: 57mm 32mm; margin: 0; }` toevoegen als hint (werkt in Chrome, wordt genegeerd in Safari -- geen kwaad)
- `body` exact op 57x32mm zetten zodat de content altijd binnen de grenzen blijft, ook als de browser een groter papierformaat gebruikt

### 3. Preview-tekst updaten
De preview-tekst boven de sticker ook aanpassen van "DYMO 11354" verwijzing naar meer generieke beschrijving.

## Technische wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/inventory/ChecklistQRDialog.tsx` | Print-instructie tekst aanpassen, `@page size` hint toevoegen aan print CSS |

## Verwacht resultaat

- Gebruiker krijgt werkbare instructies die aansluiten bij wat de browser daadwerkelijk toont
- Sticker past correct op het label ongeacht het gekozen papierformaat in de browser

