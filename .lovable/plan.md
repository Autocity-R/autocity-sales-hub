

## Fix: Daan B2B Analyse — 4 bugs in `daan-b2b-analyse/index.ts`

### Samenvatting
De B2B analyse werkt niet correct door 4 bugs: verkeerde vehicle filter, ontbrekende data voor Claude, te brede JP Cars queries, en verkeerde veldnamen.

### Database feiten (bewezen)
| Groep | Aantal |
|-------|--------|
| `voorraad` + offline + niet-inruil + **onderweg** | **47** ← dit zijn je B2B kansen |
| `voorraad` + offline + niet-inruil + aangekomen | 6 |
| `voorraad` + online + niet-inruil | 88 |
| `voorraad` + inruil | 40 |

De huidige code sluit de 47 onderweg-auto's **uit** (regel 382: `if (d.transportStatus === "onderweg") return false`). Dit is precies omgekeerd — die auto's zijn juist de kansen.

### Bug 1: Filter is omgekeerd (KRITIEK)
**Nu:** Regel 382 sluit `transportStatus === "onderweg"` uit → 6 auto's over.
**Fix:** Verwijder die exclusie. Alle offline + niet-inruil auto's zijn B2B kandidaten (53 stuks: 47 onderweg + 6 aangekomen maar offline).

### Bug 2: Claude krijgt geen notes/omschrijving
**Nu:** Regel 114 stuurt alleen `brand model bouwjaar` naar Claude.
De `model` velden bevatten vaak al brandstof/vermogen info (bijv. "Q5 Sportback 55 TFSI S Line", "Seal U DM-i 1.5 phev Boost", "Focus 155pk ST Line"). Maar `notes` wordt niet meegestuurd en `year`/`mileage` worden niet uit de DB gehaald.

**Fix:**
- Voeg `year, mileage, notes` toe aan de DB select (regel 370)
- Gebruik `v.year` direct (niet alleen `details.buildYear`)
- Stuur `notes` mee naar Claude in de descriptions string
- Voeg `mileage` toe aan vehicleInputs voor JP Cars queries

### Bug 3: JP Cars query is te breed (geen bouwjaar/km per auto)
**Nu:** `uniqueCombos` groepeert op `brand|model[0]|brandstof`. Een Audi Q5 2026 15km en een Audi Q5 2023 60.000km krijgen dezelfde JP Cars resultaten.

**Fix:** Query JP Cars **per voertuig** met specifieke parameters:
- `build_year_min/max` = bouwjaar ±1
- `mileage_min/max` = kilometerstand ±20.000 (als > 1000km, anders weglaten voor nieuwe auto's)
- Rate limiting 200ms behouden
- Cache per `brand|model[0]|brandstof|bouwjaar|mileage_bucket` om dubbele calls te voorkomen (3x Audi Q5 2026 15km = 1 call)

### Bug 4: Verkeerde JP Cars veldnamen
**Nu:** `listing.stock_days` (regel 244).
**Bewezen uit taxatie-portal-search:** Het veld heet `days_in_stock`. En `jpcars-dealer-search` gebruikt `stock_days`. Beide zijn dus mogelijk.

**Fix:** Fallbacks toevoegen:
```
daysInStock = listing.days_in_stock ?? listing.stock_days ?? 0
dealerPrice = listing.price_local ?? listing.price ?? 0
dealerName  = listing.dealer_name ?? "Onbekend"
soldSince   = listing.sold_since (is al correct — is een number)
```

### Technische wijzigingen

**Regel 370** — DB select uitbreiden:
```typescript
.select("id, brand, model, year, mileage, license_number, purchase_price, notes, details, created_at")
```

**Regel 382** — Filter omdraaien:
Verwijder `if (d.transportStatus === "onderweg") return false;`

**Regel 395-400** — vehicleInputs uitbreiden:
```typescript
const vehicleInputs = offlineVehicles.map((v: any) => ({
  id: v.id,
  brand: v.brand || "",
  model: v.model || "",
  bouwjaar: v.year || v.details?.buildYear || null,
  kilometerstand: v.mileage || 0,
  omschrijving: v.notes || "",
}));
```

**Regel 114** — Claude input uitbreiden:
```typescript
const descriptions = vehicles.map((v, i) => 
  `[${i}] ${v.brand} ${v.model} ${v.bouwjaar || ""} km:${v.kilometerstand || ""} ${v.omschrijving || ""}`
).join("\n");
```

**Regel 419-430** — Per-voertuig JP Cars met slimme cache:
Vervang `uniqueCombos` met cache op `brand|model[0]|brandstof|bouwjaar|mileage_bucket(per 20k)`. Stuur `build_year_min/max` en `mileage_min/max` mee naar `queryJPCars`.

**Regel 243-246** — Veldnamen met fallbacks:
```typescript
const daysInStock = listing.days_in_stock ?? listing.stock_days ?? 0;
const dealerPrice = listing.price_local ?? listing.price ?? 0;
const dealerName = listing.dealer_name ?? "Onbekend";
```

**Debug logging** — Na elke JP Cars query:
Log merk/model/bouwjaar/km + aantal resultaten + eerste listing sample.

### Bestand

| Bestand | Actie |
|---------|-------|
| `supabase/functions/daan-b2b-analyse/index.ts` | Alle 4 bugs fixen |

Na deploy kan de analyse opnieuw gedraaid worden. Verwacht: ~47-53 auto's geanalyseerd in plaats van 6, met correcte per-auto JP Cars resultaten en dealer namen.

