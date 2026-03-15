

# Windshield Visibility Rule verwijderen + alternatieve aanpak

## Analyse

De prompt-gebaseerde aanpak werkt niet voor dit probleem. Het model negeert de instructies consequent — meer tekst toevoegen verspilt alleen tokens (~200 extra tokens per request) zonder resultaat. Het model "completeert" de scene ongeacht hoeveel FORBIDDEN-regels we toevoegen, en verandert zelfs display-content (wat een Rule #1 schending is).

## Plan

### Stap 1: Verwijder de niet-werkende toevoegingen

Uit `supabase/functions/showroom-photo-studio/index.ts`:

- **Verwijder** de "WINDSHIELD VISIBILITY RULE" sectie (regels 456-477) — de percentage-gebaseerde regels
- **Verwijder** de "CANVAS LOCK" en "EDGE MATCHING" sectie (regels 577-590) — ook niet effectief

De originele "WINDOW EDITING — PROPORTIONAL RULE" (regels 447-454) blijft behouden als basis.

### Stap 2: Alternatieve aanpak overwegen

De prompt-weg is uitgeput. Mogelijke alternatieven:

1. **Dashboard-shots accepteren zoals ze zijn** — voor strakke dashboard-crops gewoon geen showroom-bewerking toepassen (detecteren op basis van weinig/geen zichtbaar glas)
2. **Minimale bewerking voor dashboard-shots** — alleen kleurcorrectie en opschoning, geen showroom-projectie
3. **Aparte "dashboard mode"** in de UI waar de gebruiker aangeeft dat het een close-up is, met een veel simpeler prompt dat alleen opschoont zonder showroom

Elke optie vermijdt het kernprobleem: het model dwingen om NIET te doen wat het "wil" doen.

### Impact
- ~200 tokens minder per interieur-request
- Geen functionele verandering (de regels werkten toch niet)
- Edge function herdeployment nodig

