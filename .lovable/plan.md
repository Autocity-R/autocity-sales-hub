

## Plan: Kevin Dashboard — Drempels aanpassen + CRM Voorraad tab

### Drie wijzigingen in `KevinDashboard.tsx`

**1. Drempelwaarden aanpassen (categorize functie)**

Huidige drempels zijn te hoog voor de werkelijke data (gem. rang ~22). Nieuwe drempels:
- **Rood**: `rank_current < 15` OF `stock_days > stock_days_average * 1.3` OF `price_local > price_warning`
- **Geel**: `rank_current 15-30` OF `stock_days` tussen gemiddelde en +30%
- **Groen**: `rank_current > 30`

Rang-kleuring in de tabel ook aanpassen naar dezelfde drempels (15/30 i.p.v. 40/55).

**2. Gemiddelde rang card toevoegen**

Nieuwe summary card bovenin naast de bestaande cards die de gemiddelde rang van alle online voertuigen toont (bijv. "Gem. Rang: 21.9"). Geeft het team direct context over de totale marktpositie.

**3. Tweede tab: CRM Voorraad**

Dashboard opsplitsen in twee tabs via `Tabs` component:
- **Tab 1: "JP Cars Monitor"** — de huidige view (ongewijzigd qua inhoud)
- **Tab 2: "CRM Voorraad"** — eigen voorraadmonitor

CRM Voorraad tab toont alle voertuigen met `status = 'voorraad'` die nog niet verkocht zijn, ongeacht of ze online staan:

| Kolom | Bron |
|-------|------|
| Merk + Model | vehicles |
| Kenteken | vehicles |
| Type (Inkoop/Inruil) | vehicles.details.isTradeIn |
| Inkoopprijs | vehicles.purchase_price |
| Verkoopprijs | vehicles.selling_price |
| Stagedagen | berekend vanaf vehicles.created_at |
| Import status | vehicles.import_status |
| Online | vehicles.details.showroomOnline |

Gesorteerd op stagedagen (langst eerst). Aparte query voor deze tab die alle voorraad voertuigen ophaalt (niet alleen online).

### Technische details

- Eén bestand wordt gewijzigd: `src/components/ai-agents/dashboards/KevinDashboard.tsx`
- Import `Tabs, TabsList, TabsTrigger, TabsContent` uit bestaande UI components
- Nieuwe query `kevin-crm-vehicles` voor alle voorraad voertuigen
- Gemiddelde rang berekend als `joined.reduce(...) / count` over voertuigen met rank_current !== null

