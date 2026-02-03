
# Plan: RLS Policies Repareren voor Aftersales Manager en Verkopers

## Probleem Geïdentificeerd

Na analyse van de database RLS policies en de code, heb ik de volgende problemen gevonden:

### 1. Contacts Tabel - Aftersales Manager Ontbreekt

**Huidige RLS policy voor SELECT:**
```sql
has_role(auth.uid(), 'admin'::app_role) OR 
has_role(auth.uid(), 'owner'::app_role) OR 
has_role(auth.uid(), 'manager'::app_role) OR 
has_role(auth.uid(), 'verkoper'::app_role)
```

De `aftersales_manager` rol ontbreekt! Dit betekent:
- Lloyd (aftersales_manager) kan **geen klanten zien** die aan auto's gekoppeld zijn
- Hierdoor ziet hij in het Aftersales dashboard geen klantnamen bij de B2C leveringen

### 2. Voertuig Aflevering - Vehicles UPDATE Policy

**Huidige RLS policy voor UPDATE:**
```sql
has_role(auth.uid(), 'admin'::app_role) OR 
has_role(auth.uid(), 'owner'::app_role) OR 
has_role(auth.uid(), 'manager'::app_role) OR 
has_role(auth.uid(), 'verkoper'::app_role)
```

De `verkoper` rol staat erbij, dus verkopers zouden wel auto's moeten kunnen afleveren. Als dit niet werkt, is er mogelijk een sessie/authenticatie probleem.

## Oplossing

### Database Migratie

We moeten de RLS policies op de `contacts` tabel updaten om de `aftersales_manager` rol toe te voegen voor SELECT rechten:

```sql
-- Drop oude policy
DROP POLICY IF EXISTS "Authorized users can view contacts" ON contacts;

-- Maak nieuwe policy met aftersales_manager
CREATE POLICY "Authorized users can view contacts" 
ON contacts FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role) OR
  has_role(auth.uid(), 'aftersales_manager'::app_role)
);
```

## Gebruikers Betrokken

| Gebruiker | Email | Rol | Huidig Probleem |
|-----------|-------|-----|-----------------|
| Lloyd | lloyd@auto-city.nl | aftersales_manager | Kan geen klanten zien |
| Alex | alex@auto-city.nl | verkoper | Zou moeten werken |
| Martijn | martijn@auto-city.nl | verkoper | Zou moeten werken |
| Mario | mario@auto-city.nl | verkoper | Zou moeten werken |

## Extra Controle Nodig

Als de verkopers nog steeds problemen hebben na het verifiëren dat de RLS correct is:
1. Vraag hen uit te loggen en opnieuw in te loggen
2. Check of hun sessie geldig is (geen "Invalid Refresh Token" errors)
3. Controleer of de `has_role` functie correct werkt voor hun user_id

## Bestandswijzigingen

| Type | Actie |
|------|-------|
| Database | RLS policy updaten op `contacts` tabel |
