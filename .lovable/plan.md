## Robin v7 implementatie

De v7 prompt staat al live in `ai_agents.system_prompt` (Claude heeft 'm geüpload) en de edge function leest die al dynamisch (regel 66-68). Stap 1 is dus klaar. Wat resteert: de output van v7 vasthouden en zichtbaar maken.

### 1. Database (stap 2)
Migratie al uitgevoerd: `intake_damages` heeft nu kolommen `detectie_blok` en `detectie_bewijs` (TEXT, nullable). De `blokken_toegepast`-array per onderdeel blijft binnen `robin_analyse` JSONB — geen schema-wijziging nodig.

### 2. Edge function — persist de nieuwe velden
`supabase/functions/intake-robin-analyse/index.ts`, in de `rows.map` (rond regel 134-149), 2 velden toevoegen:
```text
detectie_blok: d.detectie_blok || null,
detectie_bewijs: d.detectie_bewijs || null,
```

### 3. PDF generator — toon blok + bewijs per schade (stap 3)
In `drawDamage` (regel 476-529):
- In de details-tabel (regel 508-518) een rij toevoegen:
  `["Detectie-methode", prettyBlok(d.detectie_blok), false]`
  met een helper `prettyBlok("A_deuk") → "Blok A — deuk via reflectie-vervorming"` voor alle 7 blokken (A_deuk, B_kras, C_steenslag, D_lakschade, E_glas, F_velg, G_trim).
- Direct na de details-tabel, als `d.detectie_bewijs` gevuld is: een licht-grijs kaartje "Wat Robin zag:" met de bewijs-tekst (multi-line wrap), zodat het team de redenering kan controleren.

### 4. Test (stap 4)
Na deploy: nieuwe inspectie draaien op Tiguan 0234. Verwacht:
- Minimaal 1 schade met `detectie_blok = "A_deuk"` op achterklep links-boven
- PDF toont "Blok A — deuk via reflectie-vervorming" + bewijs-tekst
- Realtime UI blijft werken (statusupdates komen al door dankzij eerdere migratie)

### Buiten scope (bewust)
- Geen wijzigingen aan frame-extractie (kwaliteit/fps) — v7-prompt lost dit op via betere detectie-methode i.p.v. meer frames.
- Geen tweede verificatie-pass — v7 bewees in 4 tests al consistent te zijn.
- `IntakeInspectionList.tsx` toont al schade-count; geen UI-uitbreiding nodig.

### Bestanden
- `supabase/migrations/...` — al uitgevoerd ✅
- `supabase/functions/intake-robin-analyse/index.ts` — 2 velden persisteren + PDF-uitbreiding
