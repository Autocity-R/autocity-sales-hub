import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Aantal goedgekeurde externe klussen zonder factuur (badge op menu-item Facturen).
 * Alleen-lezen RPC; bij een fout tonen we geen badge.
 */
export function useFacturenOpen() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc("extern_facturen_open_aantal");
      if (!cancel) setCount(error ? 0 : Number(data) || 0);
    })();
    return () => { cancel = true; };
  }, []);

  return count;
}
