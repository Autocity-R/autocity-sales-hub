import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeContacts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("public:contacts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "contacts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
          queryClient.invalidateQueries({ queryKey: ["contacts", "all"] });
          queryClient.invalidateQueries({ queryKey: ["contacts", "supplier"] });
          queryClient.invalidateQueries({ queryKey: ["contacts", "b2b"] });
          queryClient.invalidateQueries({ queryKey: ["contacts", "b2c"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "contacts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "contacts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
