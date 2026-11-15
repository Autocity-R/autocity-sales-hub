import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Naam van één medewerker (voor "geregistreerd door X"). Eén kleine query, lang gecachet. */
export function useProfileName(id: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["profileName", id],
    enabled: !!id,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("first_name, last_name, email").eq("id", id!).maybeSingle();
      const p = data as any;
      if (!p) return null;
      return `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email || null;
    },
  });
  return data ?? null;
}
