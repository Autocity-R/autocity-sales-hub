-- ============================================
-- KRITIEKE BEVEILIGING: RLS Policies voor alle gevoelige tabellen
-- ============================================

-- 1. CONTACTS TABLE - Bevat klantgegevens
-- Verwijder oude "allow all" policy
DROP POLICY IF EXISTS "Allow all for now" ON contacts;

-- Alleen authenticated users kunnen contacts zien
CREATE POLICY "Authenticated users can view contacts"
ON contacts FOR SELECT
TO authenticated
USING (true);

-- Alleen authenticated users kunnen contacts aanmaken
CREATE POLICY "Authenticated users can insert contacts"
ON contacts FOR INSERT
TO authenticated
WITH CHECK (true);

-- Alleen authenticated users kunnen contacts updaten
CREATE POLICY "Authenticated users can update contacts"
ON contacts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Alleen authenticated users kunnen contacts verwijderen
CREATE POLICY "Authenticated users can delete contacts"
ON contacts FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 2. VEHICLES TABLE - Bevat voertuiginformatie
-- ============================================
DROP POLICY IF EXISTS "Allow all for now" ON vehicles;

-- Alleen authenticated users kunnen voertuigen zien
CREATE POLICY "Authenticated users can view vehicles"
ON vehicles FOR SELECT
TO authenticated
USING (true);

-- Alleen authenticated users kunnen voertuigen aanmaken
CREATE POLICY "Authenticated users can insert vehicles"
ON vehicles FOR INSERT
TO authenticated
WITH CHECK (true);

-- Alleen authenticated users kunnen voertuigen updaten
CREATE POLICY "Authenticated users can update vehicles"
ON vehicles FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Alleen authenticated users kunnen voertuigen verwijderen
CREATE POLICY "Authenticated users can delete vehicles"
ON vehicles FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 3. LEADS TABLE - Bevat CRM informatie
-- ============================================
DROP POLICY IF EXISTS "Allow all for now" ON leads;

-- Alleen authenticated users kunnen leads zien
CREATE POLICY "Authenticated users can view leads"
ON leads FOR SELECT
TO authenticated
USING (true);

-- Alleen authenticated users kunnen leads aanmaken
CREATE POLICY "Authenticated users can insert leads"
ON leads FOR INSERT
TO authenticated
WITH CHECK (true);

-- Alleen authenticated users kunnen leads updaten
CREATE POLICY "Authenticated users can update leads"
ON leads FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Alleen authenticated users kunnen leads verwijderen
CREATE POLICY "Authenticated users can delete leads"
ON leads FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 4. CONTRACTS TABLE - Bevat contractinformatie
-- ============================================
DROP POLICY IF EXISTS "Allow all for now" ON contracts;

-- Alleen authenticated users kunnen contracten zien
CREATE POLICY "Authenticated users can view contracts"
ON contracts FOR SELECT
TO authenticated
USING (true);

-- Alleen authenticated users kunnen contracten aanmaken
CREATE POLICY "Authenticated users can insert contracts"
ON contracts FOR INSERT
TO authenticated
WITH CHECK (true);

-- Alleen authenticated users kunnen contracten updaten
CREATE POLICY "Authenticated users can update contracts"
ON contracts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Alleen authenticated users kunnen contracten verwijderen
CREATE POLICY "Authenticated users can delete contracts"
ON contracts FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 5. WARRANTY_CLAIMS TABLE - Bevat garantieclaims
-- ============================================
DROP POLICY IF EXISTS "Allow all for now" ON warranty_claims;

-- Alleen authenticated users kunnen warranty claims zien
CREATE POLICY "Authenticated users can view warranty claims"
ON warranty_claims FOR SELECT
TO authenticated
USING (true);

-- Alleen authenticated users kunnen warranty claims aanmaken
CREATE POLICY "Authenticated users can insert warranty claims"
ON warranty_claims FOR INSERT
TO authenticated
WITH CHECK (true);

-- Alleen authenticated users kunnen warranty claims updaten
CREATE POLICY "Authenticated users can update warranty claims"
ON warranty_claims FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Alleen authenticated users kunnen warranty claims verwijderen
CREATE POLICY "Authenticated users can delete warranty claims"
ON warranty_claims FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 6. LOAN_CARS TABLE - Bevat leenauto informatie
-- ============================================
DROP POLICY IF EXISTS "Allow all for now" ON loan_cars;

-- Alleen authenticated users kunnen loan cars zien
CREATE POLICY "Authenticated users can view loan cars"
ON loan_cars FOR SELECT
TO authenticated
USING (true);

-- Alleen authenticated users kunnen loan cars aanmaken
CREATE POLICY "Authenticated users can insert loan cars"
ON loan_cars FOR INSERT
TO authenticated
WITH CHECK (true);

-- Alleen authenticated users kunnen loan cars updaten
CREATE POLICY "Authenticated users can update loan cars"
ON loan_cars FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Alleen authenticated users kunnen loan cars verwijderen
CREATE POLICY "Authenticated users can delete loan cars"
ON loan_cars FOR DELETE
TO authenticated
USING (true);