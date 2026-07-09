-- Fase 4: seed Rotterdam branch met huidige hardcoded contract-gegevens zodat
-- de branches-tabel de bron van waarheid wordt voor koopcontract-headers.
UPDATE public.branches
SET
  company_name = 'Autocity Automotive Group B.V',
  address      = COALESCE(address, 'Thurledeweg 61a'),
  postal_code  = COALESCE(postal_code, '3044ER'),
  city         = COALESCE(city, 'Rotterdam'),
  phone        = COALESCE(phone, '010-2623980'),
  email        = COALESCE(email, 'verkoop@auto-city.nl'),
  kvk_number   = COALESCE(kvk_number, '98322702'),
  btw_number   = COALESCE(btw_number, 'NL868445794B01'),
  iban         = COALESCE(iban, 'NL24ABNA0595583911'),
  updated_at   = now()
WHERE code = 'rotterdam';