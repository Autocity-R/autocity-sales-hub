REVOKE ALL ON FUNCTION public.werkorder_factuur_niet_nodig(uuid, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.werkorder_toch_factureren(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.werkorder_factuur_niet_nodig(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.werkorder_toch_factureren(uuid) TO authenticated;