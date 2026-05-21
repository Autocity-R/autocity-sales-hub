UPDATE public.intake_inspections
SET status = 'analyzing',
    error_message = NULL,
    categorie = NULL,
    categorie_reden = NULL,
    totale_kosten_min = NULL,
    totale_kosten_max = NULL,
    schade_count = NULL,
    claim_aanbevolen = NULL,
    claim_waarde = NULL,
    robin_analyse = NULL,
    samenvatting_team = NULL,
    pdf_url = NULL,
    pdf_generated_at = NULL
WHERE id = 'a7b71a0b-e6ea-49db-be02-0c0b1488a0e2';