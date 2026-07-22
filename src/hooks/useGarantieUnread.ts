import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Aantal garantie-threads met actie nodig (laatste event is inkomende mail). */
export function useGarantieUnread() {
  const { userRole } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (userRole !== "aftersales_manager") return;
    let cancel = false;
    const load = async () => {
      const { data: threads } = await supabase
        .from("garantie_email_threads")
        .select("id")
        .neq("thread_status", "afgerond")
        .limit(500);
      if (!threads?.length) { if (!cancel) setCount(0); return; }
      const ids = threads.map((t: any) => t.id);
      const { data: emails } = await supabase
        .from("garantie_emails")
        .select("thread_id, richting, received_at, created_at")
        .in("thread_id", ids)
        .order("received_at", { ascending: false })
        .limit(2000);
      const lastByThread = new Map<string, string>();
      for (const e of ((emails as any[]) || [])) {
        if (!lastByThread.has(e.thread_id)) lastByThread.set(e.thread_id, e.richting);
      }
      let n = 0;
      for (const r of lastByThread.values()) if (r === "inkomend") n++;
      if (!cancel) setCount(n);
    };
    load();
    const i = setInterval(load, 60_000);
    return () => { cancel = true; clearInterval(i); };
  }, [userRole]);

  return count;
}
