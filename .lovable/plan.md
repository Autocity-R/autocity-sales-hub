

## Plan: Excel Download + Email met 3 Tabs

### Samenvatting
Drie dingen toevoegen:
1. **Download knop** in het Daan Dashboard voor de B2B Excel (na analyse)
2. **Excel upgraden** met JP Cars window link per kans + professionele layout zoals het voorbeeld
3. **Email Excel bijlage** uitbreiden met 3 tabs: B2B Kansen, Team Performance, Niet Online

---

### Wijziging 1: Excel uitbreiden met JP Cars link + 3 tabs

**Bestand: `supabase/functions/daan-b2b-analyse/index.ts`**

**B2BKans interface** — voeg `jpCarsUrl` toe (portal URL uit window response)

**queryJPCarsValuation** — `enable_portal_urls=true` zodat elke listing een `portal_url` of `jpcars_url` bevat. Geef deze URL mee in de B2BKans.

**buildExcel** uitbreiden met 3 tabs:
- **Tab 1: B2B Kansen** — Bestaande sterke + mogelijke kansen, maar met extra kolom "JP Cars" als klikbare hyperlink naar het window (zodat verkopers de verkochte auto kunnen dubbelchecken)
- **Tab 2: Team Performance** — Dezelfde data als het dashboard (verkoper, B2C, B2B, omzet, marge%, status, trend) opgehaald uit de vehicles tabel in de edge function
- **Tab 3: Niet Online** — Auto's die ingeschreven zijn maar geen online prijs hebben (status voorraad, transportStatus=aangekomen, showroomOnline!=true), met kolommen: Auto, Kenteken, Inkoopprijs, Dagen in bezit, Status, Advies

Layout volgt exact het geüploade voorbeeld: donkerblauwe headers, gekleurde categorie-secties, professionele styling.

**Email return** — Edge function geeft de Excel met alle 3 tabs mee als bijlage in de email (via signed URL download link).

**Download mode response** — Voeg `excelUrl` toe aan het download mode response zodat de frontend direct de Excel kan downloaden.

### Wijziging 2: Download knop in Dashboard

**Bestand: `src/components/ai-agents/dashboards/DaanDashboard.tsx`**

Na de "Analyse" knop een **Download Excel** knop toevoegen:
- Roept de edge function aan met `mode: "download"` 
- Edge function genereert de Excel, uploadt naar `daan-analyses` bucket, retourneert signed URL
- Frontend opent de signed URL in een nieuw tabblad voor download
- Knop is disabled als er geen analyse data is

### Wijziging 3: Edge function aanpassen voor alle 3 data-queries

In de edge function, naast de B2B analyse ook:
1. **Team Performance query** — verkochte voertuigen deze maand, gegroepeerd per verkoper (zelfde logica als dashboard)
2. **Niet Online query** — voorraad auto's die aangekomen zijn maar niet online staan (showroomOnline !== true, transportStatus === 'aangekomen')

Beide datasets worden in de Excel verwerkt ongeacht of het email-mode of download-mode is.

### Technisch overzicht

| Bestand | Actie |
|---------|-------|
| `supabase/functions/daan-b2b-analyse/index.ts` | Excel 3 tabs, JP Cars URL, team + niet-online queries |
| `src/components/ai-agents/dashboards/DaanDashboard.tsx` | Download knop toevoegen |

