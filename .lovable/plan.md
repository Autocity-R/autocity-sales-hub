

## Plan: Kevin Voorraad Monitor Rol Verduidelijken + Ontbrekende Tools

### Wat je wilt

De voorraad monitor (`jpcars_voorraad_monitor`) heeft een dubbele rol:
1. **Voorraad bewaking** -- Is onze voorraad nog actueel? Hoe courant is het? Waar moeten we op letten? Marktverschuivingen detecteren om omloopsnelheid hoog te houden.
2. **Leerinstrument** -- Welke modellen verkopen goed aan klant X of B2B? Wat werkt, wat niet?

Kevin moet NIET alleen naar buiten kijken (markt), maar de voorraad monitor gebruiken als spiegel: "dit hebben we, zo presteert het, dit leren we ervan."

### Wat er wijzigt

**1 bestand:** `supabase/functions/kevin-ai-chat/index.ts`

#### Stap 1: Nieuwe tool `get_scale_opportunities`
Filtert de eigen voorraad op de "Ideale Inkoopcombinatie" criteria:
- Matcht `jpcars_voorraad_monitor` voertuigen met ETR/courantheid data uit `taxatie_valuations`
- Identificeert modellen waar eigen stagedagen < 25, markt avgDays < 45, ETR >= 4
- Geeft Kevin direct antwoord op: "Welke modellen moeten we opschalen?"

#### Stap 2: Nieuwe tool `get_market_fast_movers`
Queryt de `taxatie_valuations` tabel (16.466 records) om de bredere markt te lezen:
- Groepeert op merk/model
- Filtert op ETR >= 4, courantheid "hoog"
- Berekent gemiddelde marktdagen, frequentie, marge
- Kevin kan hiermee adviseren over modellen die jullie nog NIET hebben

#### Stap 3: Dynamische marktdata in context
Vervangt de hardcoded "MARKTTRENDS" sectie (regel 3-32 van de system prompt) door een dynamische query op `taxatie_valuations` die bij elke chat-sessie de actuele top modellen berekent per categorie (EV, PHEV, benzine).

#### Stap 4: Voorraad monitor rol verduidelijken in context
Voegt een korte instructie toe aan de dynamische context die Kevin injecteert:

> "De Voorraad Monitor toont onze huidige online etalage. Gebruik deze data om:
> (1) Te bewaken of onze voorraad courant is en waar actie nodig is
> (2) Marktverschuivingen te detecteren die onze omloopsnelheid bedreigen
> (3) Te leren welke modellen goed verkopen (B2C vs B2B) en bij welke leveranciers
> Voor nieuwe inkoopadviezen over modellen die we nog niet hebben, gebruik `get_market_fast_movers`."

### Geen database migratie nodig
Alle queries zijn read-only op bestaande tabellen (`taxatie_valuations`, `jpcars_voorraad_monitor`, `vehicles`).

### Resultaat
Kevin krijgt 8 tools (was 6):
1. `get_vehicle_detail` -- detail per voertuig
2. `get_slow_movers` -- langzame voorraad
3. `get_price_recommendation` -- prijsadvies
4. `get_market_summary` -- marktoverzicht
5. `get_market_trends` -- historische trends
6. `get_supplier_analysis` -- leverancier prestaties
7. **`get_scale_opportunities`** -- welke modellen opschalen (eigen data + taxaties)
8. **`get_market_fast_movers`** -- courante modellen in de brede markt (taxaties)

Plus dynamische markttrends in plaats van hardcoded data in de prompt.

