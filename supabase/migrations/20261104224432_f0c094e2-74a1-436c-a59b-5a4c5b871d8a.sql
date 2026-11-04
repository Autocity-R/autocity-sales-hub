ALTER TABLE public.warranty_claims ALTER COLUMN claim_nummer SET DEFAULT '';
GRANT EXECUTE ON FUNCTION public.voertuig_open_punten(uuid) TO postgres;