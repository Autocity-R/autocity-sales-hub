

## Plan: Prijspositie-Alert Tool voor Kevin

### Wat je wilt

Kevin moet proactief waarschuwen wanneer een auto niet meer correct gepositioneerd staat in de markt. Dit werkt zoals jullie taxatieproces: een auto (bijv. bouwjaar 2022, 85.000 km) wordt vergeleken met vergelijkbaar materiaal (tot ~100.000 km, met vergelijkbare opties als M Sport, panoramadak). Kevin moet dagelijks/bij elke chat laten zien waar de positionering verschoven is.

### Wat er wijzigt

**1 bestand:** `supabase/functions/kevin-ai-chat/index.ts`

### Wijzigingen

#### 1. Nieuwe tool: `get_positioning_alerts`

Een 9e tool die automatisch alle misgepositioneerde voertuigen identificeert:

- **Prijspositie check:** Vergelijkt `price_local` met `vvp_50` (marktmediaan) en `price_warning`. Vlaggen als prijs > mediaan + 10% of prijs > `price_warning`.
- **Rang vs. target:** Vergelijkt `rank_current` met `rank_target`. Vlaggen als huidige rang ver onder target (bijv. rank 14 bij target 4).
- **Stagedagen vs. marktgemiddelde:** Vlaggen als `stock_days` > `stock_days_average * 1.2`.
- **Concurrentie context:** Toont `competitive_set_size` / `window_size` (hoeveel vergelijkbare auto's staan er) plus de `options` die de auto heeft — zodat Kevin kan uitleggen "deze auto met M Sport en panoramadak staat qua prijs X% boven mediaan bij Y concurrenten".
- **Adviesprijs:** Geeft VVP-range (vvp_25, vvp_50, vvp_75) als referentie voor correcte positionering.
- **Actie suggestie:** Per auto een concrete suggestie (prijs verlagen naar €X, of "goed gepositioneerd, monitoren").

Output voorbeeld:
```
⚠️ POSITIONERING ALERTS (5 voertuigen)

1. HYUNDAI IONIQ 5 (NB) — ACTIE VEREIST
   Prijs: €31.750 | Mediaan: €29.937 (+6,1%)
   Rang: 18 (target: 6) | 84 dagen (gem: 37)
   Opties: Panoramadak, Leder, Adaptive Cruise, Heat Pump
   Concurrentie: 21 vergelijkbare online
   → Advies: Verlaag naar €29.500-€30.000 (VVP50-VVP75 range)

2. POLESTAR 2 (P-322-NL) — ACTIE VEREIST
   Prijs: €21.950 | Mediaan: €20.829 (+5,4%)
   Rang: 14 (target: 4) | 66 dagen (gem: 22)
   Opties: 4x4, Long Range, Panoramadak, Premium Audio
   Concurrentie: 14 vergelijkbare online
   → Advies: Verlaag naar €20.500 of B2B afstoten
```

#### 2. Proactieve alert in context

Voeg aan de bestaande `marketContext` (regel 134-170) een sectie toe die **automatisch** bij elke chat de misgepositioneerde auto's samenvat. Kevin ziet dit direct zonder dat de tool handmatig aangeroepen hoeft te worden:

```
### ⚠️ POSITIONERING ALERTS
X voertuigen staan niet correct gepositioneerd:
- [auto 1]: prijs +X% boven mediaan, rang X (target Y)
- [auto 2]: ...
```

Dit zorgt ervoor dat Kevin bij elke vraag — ook als de gebruiker niet specifiek vraagt — kan waarschuwen: "Even tussendoor, ik zie dat de Ioniq 5 al 84 dagen staat en 6% boven mediaan geprijsd is."

#### 3. Voertuig-context verrijken met opties

De huidige "Alle Online Voertuigen" regel (169) toont geen opties. Voeg `options` toe zodat Kevin bij elke auto weet welke uitvoering het betreft — essentieel voor het vergelijken van "vergelijkbaar materiaal" zoals jullie dat doen bij taxaties.

### Geen database migratie nodig

Alle benodigde data (`price_warning`, `vvp_50`, `rank_target`, `options`, `competitive_set_size`) zit al in `jpcars_voorraad_monitor`.

### Resultaat

Kevin krijgt 9 tools (was 8) en ziet bij elke chat automatisch welke auto's niet correct gepositioneerd staan, inclusief vergelijkbare marktcontext en concrete prijsadviezen.

