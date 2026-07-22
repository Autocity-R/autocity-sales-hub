import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInHours, differenceInDays } from "date-fns";
import { applyBranchFilter, type BranchFilter } from "@/contexts/BranchContext";

export type NotificationSeverity = "red" | "orange" | "info";
export type NotificationKind =
  | "warranty_overdue"
  | "warranty_warning"
  | "workorder_review"
  | "delivery_not_ready"
  | "intake_pending";

export interface AftersalesNotification {
  id: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  detail: string;
  href: string;
  createdAt: string;
}

const READ_KEY = "aftersales_notifications_read_v1";

function loadRead(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function useAftersalesNotifications(branch: BranchFilter) {
  const [readIds, setReadIds] = useState<Set<string>>(() => loadRead());

  const markRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        window.localStorage.setItem(READ_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const markAllRead = (ids: string[]) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((i) => next.add(i));
      try {
        window.localStorage.setItem(READ_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const query = useQuery({
    queryKey: ["aftersales-notifications", branch],
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async (): Promise<AftersalesNotification[]> => {
      const notifs: AftersalesNotification[] = [];
      const now = new Date();

      // 1) Garantie-mailthreads: wachtend op reactie
      const { data: threads } = await supabase
        .from("garantie_email_threads")
        .select("id, klant_naam, klant_email, onderwerp, laatste_email_op, thread_status")
        .neq("thread_status", "gesloten")
        .order("laatste_email_op", { ascending: false })
        .limit(50);
      if (threads) {
        for (const t of threads as any[]) {
          if (!t.laatste_email_op) continue;
          // check laatste email richting
          const { data: lastEmail } = await supabase
            .from("garantie_emails")
            .select("richting, received_at")
            .eq("thread_id", t.id)
            .order("received_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!lastEmail || (lastEmail as any).richting !== "inkomend") continue;
          const hours = differenceInHours(now, new Date((lastEmail as any).received_at));
          if (hours >= 20) {
            notifs.push({
              id: `warranty-red-${t.id}`,
              kind: "warranty_overdue",
              severity: "red",
              title: "Garantie-mail nadert 24u-grens",
              detail: `${t.klant_naam || t.klant_email}: ${t.onderwerp || "geen onderwerp"} — ${hours}u wachtend`,
              href: "/warranty",
              createdAt: (lastEmail as any).received_at,
            });
          } else if (hours >= 12) {
            notifs.push({
              id: `warranty-orange-${t.id}`,
              kind: "warranty_warning",
              severity: "orange",
              title: "Garantie-mail >12u zonder reactie",
              detail: `${t.klant_naam || t.klant_email}: ${t.onderwerp || "geen onderwerp"} — ${hours}u wachtend`,
              href: "/warranty",
              createdAt: (lastEmail as any).received_at,
            });
          }
        }
      }

      // 2) Werk afgerond, wacht op controle
      let woq = supabase
        .from("work_orders")
        .select("id, discipline, description, vehicle_id, finished_at, vehicles:vehicle_id(brand, model, license_number)")
        .eq("status", "afgerond")
        .order("finished_at", { ascending: true })
        .limit(50);
      woq = applyBranchFilter(woq, branch);
      const { data: wos } = await woq;
      for (const w of ((wos as any[]) || [])) {
        const v = w.vehicles;
        notifs.push({
          id: `wo-review-${w.id}`,
          kind: "workorder_review",
          severity: "orange",
          title: "Werk afgerond, wacht op controle",
          detail: `${v?.brand || ""} ${v?.model || ""} ${v?.license_number ? `(${v.license_number})` : ""} — ${w.description || w.discipline}`.trim(),
          href: "/werkplaats/goedkeuren",
          createdAt: w.finished_at || new Date().toISOString(),
        });
      }

      // 3) Aflevering morgen terwijl auto nog niet gereed
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);
      let vq = supabase
        .from("vehicles")
        .select("id, brand, model, license_number, delivery_date, import_status, details")
        .eq("status", "verkocht_b2c")
        .eq("delivery_date", tomorrowStr);
      vq = applyBranchFilter(vq, branch);
      const { data: vehicles } = await vq;
      for (const v of ((vehicles as any[]) || [])) {
        const details = v.details || {};
        const cl = details.preDeliveryChecklist || [];
        const total = Array.isArray(cl) ? cl.length : 0;
        const done = Array.isArray(cl) ? cl.filter((i: any) => i.completed === true).length : 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const ready = pct === 100 && v.import_status === "ingeschreven";
        if (!ready) {
          const bits: string[] = [];
          if (pct < 100) bits.push(`checklist ${pct}%`);
          if (v.import_status !== "ingeschreven") bits.push("nog niet ingeschreven");
          notifs.push({
            id: `delivery-${v.id}`,
            kind: "delivery_not_ready",
            severity: "red",
            title: "Aflevering morgen — auto nog niet gereed",
            detail: `${v.brand} ${v.model} ${v.license_number ? `(${v.license_number})` : ""} — ${bits.join(" · ")}`.trim(),
            href: "/inventory/consumer",
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 4) Binnengemelde auto >24u zonder inname
      let iq = supabase
        .from("vehicle_intakes")
        .select("id, vehicle_id, created_at, vehicles:vehicle_id(brand, model, license_number)")
        .eq("status", "open")
        .order("created_at", { ascending: true })
        .limit(50);
      iq = applyBranchFilter(iq, branch);
      const { data: intakes } = await iq;
      for (const it of ((intakes as any[]) || [])) {
        const hrs = differenceInHours(now, new Date(it.created_at));
        if (hrs >= 24) {
          const v = it.vehicles;
          notifs.push({
            id: `intake-${it.id}`,
            kind: "intake_pending",
            severity: "orange",
            title: "Binnengemelde auto >24u zonder inname",
            detail: `${v?.brand || ""} ${v?.model || ""} ${v?.license_number ? `(${v.license_number})` : ""} — ${differenceInDays(now, new Date(it.created_at))}d wachtend`.trim(),
            href: "/werkplaats/inname",
            createdAt: it.created_at,
          });
        }
      }

      // Nieuwste eerst
      return notifs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
  });

  const notifications = query.data || [];
  const unread = notifications.filter((n) => !readIds.has(n.id));

  return {
    notifications,
    unreadCount: unread.length,
    isLoading: query.isLoading,
    readIds,
    markRead,
    markAllRead: () => markAllRead(notifications.map((n) => n.id)),
  };
}