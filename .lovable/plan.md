

## Marge/financiële data verbergen voor verkopers

Mario werkt nu — alleen de marge-informatie moet verborgen worden voor niet-admin/owner gebruikers.

### Aanpak

**`SalespersonDetailDialog.tsx`** — voeg `showMargins` prop toe (default `false`):
- Verberg summary cards "Totale Winst" en "Gem. Marge" wanneer `showMargins === false`
- Verberg tabelkolommen "Inkoopprijs", "Marge €", en "Marge %" wanneer `showMargins === false`
- Grid past zich aan: `grid-cols-2` ipv `grid-cols-4` voor summary stats

**`DaanDashboard.tsx`** — gebruik `useRoleAccess` om te bepalen of marges zichtbaar zijn:
- Importeer `useRoleAccess`
- Geef `showMargins={isAdmin}` mee aan `SalespersonDetailDialog`
- Admin en owner zien alles, verkopers zien alleen: Datum, Voertuig, Verkoopprijs

**`SalespersonPerformance.tsx`** (rapportages pagina) — zelfde aanpassing:
- Importeer `useRoleAccess`
- Geef `showMargins={isAdmin}` mee

### Bestanden

| Bestand | Actie |
|---------|-------|
| `src/components/reports/SalespersonDetailDialog.tsx` | `showMargins` prop toevoegen, conditioneel kolommen/stats verbergen |
| `src/components/ai-agents/dashboards/DaanDashboard.tsx` | `useRoleAccess` + `showMargins` prop doorgeven |
| `src/components/reports/SalespersonPerformance.tsx` | `useRoleAccess` + `showMargins` prop doorgeven |

