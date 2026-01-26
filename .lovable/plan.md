
# Plan: Compacte Excel Werklijst Export

## Overzicht

Een simpele, print-vriendelijke Excel export voor operationele medewerkers. Compact formaat dat op A4 past.

## Kolommen (5 kolommen - past op A4)

| Kolom | Breedte | Inhoud |
|-------|---------|--------|
| Merk | 10 | Toyota, Kia, VW |
| Model | 12 | e-Niro, Taigo |
| Kenteken | 10 | J-481-VK |
| VIN | 8 | Laatste 8 tekens |
| Taak | 35 | Omschrijving |
| ✓ | 5 | Lege checkbox |

## Voorbeeld Print Layout

```text
╔══════════════════════════════════════════════════════════════════╗
║  WERKLIJST SCHOONMAAK - 26 januari 2026                          ║
╠═══════╤═════════╤══════════╤══════════╤══════════════════════╤═══╣
║ Merk  │ Model   │ Kenteken │ VIN      │ Taak                 │ ✓ ║
╠═══════╪═════════╪══════════╪══════════╪══════════════════════╪═══╣
║ Kia   │ e-Niro  │ J-481-VK │ ...ABC12 │ Interieur reinigen   │ ○ ║
║ VW    │ Taigo   │ K-123-XY │ ...DEF34 │ Velgen poetsen       │ ○ ║
║ Toyota│ Yaris   │ L-789-ZZ │ ...GHI56 │ Stofzuigen + wassen  │ ○ ║
╚═══════╧═════════╧══════════╧══════════╧══════════════════════╧═══╝
```

## Filter Opties

Bij exporteren kan je kiezen:
- **Categorie**: Klaarmaken / Onderdelen / Werkplaats / Schadeherstel / Schoonmaak / Transport / Alles
- **Status**: Alleen open taken (geen voltooide)

## Print Optimalisatie

- Landscape oriëntatie (liggend)
- Lettergrootte 11pt voor leesbaarheid
- Dikke randen voor makkelijk schrijven
- Grote checkbox kolom (○) om af te vinken
- Titel met categorie en datum bovenaan

## Technische Implementatie

### 1. Nieuw bestand: `src/utils/taskExportExcel.ts`

Export functie met ExcelJS:
- Filtert taken op categorie
- Sorteert op huidige volgorde (zoals in de app)
- Genereert compact Excel bestand
- Zet print instellingen (A4, landscape)

### 2. Nieuw bestand: `src/components/tasks/TaskExportButton.tsx`

Dropdown button met categoriekeuzes:
- Download icoon
- Lijst met categorieën om te exporteren
- Directe download na klik

### 3. Wijziging: `src/pages/TaskManagement.tsx`

Toevoegen van export button naast "Nieuwe Taak":

```tsx
<div className="flex gap-2">
  <Button variant="outline" onClick={handleForceRefresh}>
    <RefreshCw className="h-4 w-4 mr-2" />
    Ververs
  </Button>
  <TaskExportButton tasks={tasks} />  {/* NIEUW */}
  <Button onClick={() => setShowTaskForm(true)}>
    <Plus className="h-4 w-4 mr-2" />
    Nieuwe Taak
  </Button>
</div>
```

## Bestandswijzigingen

| Bestand | Actie |
|---------|-------|
| `src/utils/taskExportExcel.ts` | Nieuw - Excel generatie |
| `src/components/tasks/TaskExportButton.tsx` | Nieuw - Export dropdown |
| `src/pages/TaskManagement.tsx` | Wijzigen - Button toevoegen |

## Resultaat

Medewerker workflow:
1. Open Taken Beheer
2. Klik op "Excel" dropdown → Kies "Schoonmaak"
3. Excel wordt gedownload: `Werklijst_Schoonmaak_26-01-2026.xlsx`
4. Print en geef mee aan medewerker
5. Medewerker vinkt af met pen ✓
