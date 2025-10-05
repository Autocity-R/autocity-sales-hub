
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Salesperson {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  initials: string;
}

export const useSalespeople = () => {
  return useQuery({
    queryKey: ["salespeople"],
    queryFn: async (): Promise<Salesperson[]> => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .eq('role', 'verkoper');

      if (error) {
        console.error("Error fetching salespeople:", error);
        throw error;
      }

      return profiles?.map(profile => ({
        id: profile.id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
        email: profile.email,
        role: "Verkoper",
        isActive: true,
        initials: `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || profile.email[0].toUpperCase()
      })) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
