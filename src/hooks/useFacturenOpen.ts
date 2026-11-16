import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Aantal goedgekeurde klussen zonder factuur (badge op menu-item Facturen): extern + intern (BOUWSTAP 19B).
 * Alleen-lezen RPC's; een fout telt als 0.
 */
export function useFacturenOpen() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const [extern, intern] = await Promise.all([
        (supabase as any).rpc("extern_facturen_open_aantal"),
        (supabase as any).rpc("intern_facturen_open_aantal"),
      ]);
      const n = (r: { data: unknown; error: unknown }) => (r.error ? 0 : Number(r.data) || 0);
      if (!cancel) setCount(n(extern) + n(intern));
    })();
    return () => { cancel = true; };
  }, []);

  return count;
}
