import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { WarrantyScheduleAction } from "@/components/warranty/ScheduleWarrantyWorkOrder";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Loader2, Search, Send, Sparkles, CheckCircle2, Phone, MapPin, StickyNote, Shield, Car, ChevronDown, Wand2, RefreshCw, Inbox, MessagesSquare, PanelRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { AsPage, AsCard, AsPill, AsMono, fmtWait } from "@/components/aftersales/ui";
import { cn } from "@/lib/utils";
import { sanitizeMailText, splitQuotedReply } from "@/utils/mailBubble";
import { buildLmsSignatureHtml } from "@/utils/lmsSignature";

type Filter = "action" | "all" | "done";

interface Thread {
  id: string;
  klant_naam: string | null;
  klant_email: string | null;
  onderwerp: string | null;
  voertuig_info: string | null;
  warranty_claim_id: string | null;
  eerste_email_op: string | null;
  laatste_email_op: string | null;
  thread_status: string | null;
}

interface Email {
  id: string;
  thread_id: string;
  sender: string | null;
  sender_email: string | null;
  subject: string | null;
  body: string | null;
  richting: string; // 'inkomend' | 'uitgaand' | 'event'
  received_at: string;
}

interface Claim {
  id: string; claim_status: string; description: string | null; created_at: string;
  vehicle_id: string | null; manual_vehicle_brand: string | null; manual_vehicle_model: string | null;
  manual_license_number: string | null;
  vehicles?: { brand: string; model: string; license_number: string | null; vin: string | null; sold_date: string | null } | null;
}

const hoursSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));
const sevOf = (h: number): "green" | "amber" | "red" => (h > 20 ? "red" : h > 12 ? "amber" : "green");
const sevColor = (s: "green" | "amber" | "red") =>
  s === "red" ? "bg-red-500" : s === "amber" ? "bg-amber-500" : "bg-emerald-500";
const sevText = (s: "green" | "amber" | "red") =>
  s === "red" ? "text-red-600" : s === "amber" ? "text-amber-700" : "text-slate-500";

const renderReplyHtml = (body: string, signatureName: string) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;font-size:14px;line-height:1.6">
  ${body.split(/\n\n+/).map(p => `<p style="margin:0 0 12px">${p.replace(/\n/g, "<br/>")}</p>`).join("")}
  ${buildLmsSignatureHtml(signatureName, "Autocity Aftersales")}
</div>`;

const GarantieInbox: React.FC = () => {
  const { user, userProfile } = useAuth() as any;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [lastByThread, setLastByThread] = useState<Map<string, Email>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [filter, setFilter] = useState<Filter>("action");
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [eventDialog, setEventDialog] = useState<{ open: boolean; type: "gebeld" | "bezoek" | "notitie" }>({ open: false, type: "notitie" });
  const [eventText, setEventText] = useState("");
  // Garantie Agent
  const [agentSuggestion, setAgentSuggestion] = useState<string>("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentHint, setAgentHint] = useState("");
  const [agentChat, setAgentChat] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [agentQuestion, setAgentQuestion] = useState("");
  const [agentAsking, setAgentAsking] = useState(false);
  const [expandedQuoted, setExpandedQuoted] = useState<Record<string, boolean>>({});
  const [agentPregenerated, setAgentPregenerated] = useState(false);
  const [agentDecision, setAgentDecision] = useState<string>("");
  const [agentAnalysis, setAgentAnalysis] = useState<string>("");
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const [agentTab, setAgentTab] = useState<"voorstel" | "overleg">("voorstel");
  const [chatUnread, setChatUnread] = useState(0);
  const replyRef = useRef<HTMLTextAreaElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const agentViewRef = useRef({ open: false, tab: "voorstel" as "voorstel" | "overleg" });

  useEffect(() => { agentViewRef.current = { open: agentPanelOpen, tab: agentTab }; }, [agentPanelOpen, agentTab]);

  // Autoscroll overlegchat
  useEffect(() => {
    if (agentPanelOpen && agentTab === "overleg") {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ block: "end" }), 60);
    }
  }, [agentChat, agentAsking, agentPanelOpen, agentTab]);

  useEffect(() => {
    if (agentPanelOpen && agentTab === "overleg") setChatUnread(0);
  }, [agentPanelOpen, agentTab]);

  // Auto-resize antwoordveld (min 90px, max 40vh)
  useEffect(() => {
    const el = replyRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = Math.round(window.innerHeight * 0.4);
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 90), max)}px`;
  }, [reply, selectedId]);

  const senderName = useMemo(() => {
    const p = userProfile;
    if (p?.first_name || p?.last_name) return `${p.first_name || ""} ${p.last_name || ""}`.trim();
    return (user?.email || "aftersales").split("@")[0];
  }, [user, userProfile]);

  const loadList = async () => {
    setLoadingList(true);
    const { data: t } = await supabase
      .from("garantie_email_threads")
      .select("id, klant_naam, klant_email, onderwerp, voertuig_info, warranty_claim_id, eerste_email_op, laatste_email_op, thread_status")
      .order("laatste_email_op", { ascending: false, nullsFirst: false })
      .limit(300);
    const list = (t as Thread[]) || [];
    setThreads(list);
    if (list.length) {
      const ids = list.map((r) => r.id);
      const { data: es } = await supabase
        .from("garantie_emails")
        .select("id, thread_id, sender, sender_email, subject, body, richting, received_at")
        .in("thread_id", ids)
        .order("received_at", { ascending: false })
        .limit(2000);
      const map = new Map<string, Email>();
      for (const e of ((es as Email[]) || [])) if (!map.has(e.thread_id)) map.set(e.thread_id, e);
      setLastByThread(map);
    } else {
      setLastByThread(new Map());
    }
    setLoadingList(false);
  };

  const loadThread = async (id: string) => {
    setLoadingThread(true);
    setSelectedId(id);
    const [{ data: es }, threadRow] = await Promise.all([
      supabase.from("garantie_emails")
        .select("id, thread_id, sender, sender_email, subject, body, richting, received_at")
        .eq("thread_id", id).order("received_at", { ascending: true }),
      Promise.resolve(threads.find((t) => t.id === id) || null),
    ]);
    setEmails((es as Email[]) || []);
    if (threadRow?.warranty_claim_id) {
      const { data: c } = await supabase
        .from("warranty_claims")
        .select("*, vehicles:vehicle_id(brand, model, license_number, vin, sold_date)")
        .eq("id", threadRow.warranty_claim_id).maybeSingle();
      setClaim((c as any) || null);
    } else {
      setClaim(null);
    }
    // Reset & load agent chat for this thread
    setAgentSuggestion("");
    setAgentHint("");
    setAgentPregenerated(false);
    setAgentDecision("");
    setAgentAnalysis("");
    const { data: concept } = await supabase
      .from("garantie_emails")
      .select("sara_reactie_voorstel, sara_analyse, sara_beslissing, received_at")
      .eq("thread_id", id)
      .eq("richting", "inkomend")
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (concept?.sara_reactie_voorstel) {
      setAgentSuggestion(String(concept.sara_reactie_voorstel).trim());
      setAgentPregenerated(true);
    }
    setAgentDecision(concept?.sara_beslissing || "");
    setAgentAnalysis(concept?.sara_analyse || "");
    setAgentPanelOpen(false);
    setExpandedQuoted({});
    setAgentTab("voorstel");
    setChatUnread(0);
    const { data: chats } = await (supabase as any)
      .from("garantie_agent_chats")
      .select("role, content")
      .eq("thread_id", id)
      .order("created_at", { ascending: true });
    setAgentChat((chats as any) || []);
    setLoadingThread(false);
  };

  useEffect(() => { loadList(); }, []);
  useEffect(() => { if (!selectedId && threads.length) loadThread(threads[0].id); /* eslint-disable-next-line */ }, [threads]);

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter((t) => {
      const last = lastByThread.get(t.id);
      const isDone = t.thread_status === "afgerond";
      const needsAction = !!last && last.richting === "inkomend";
      if (filter === "done" && !isDone) return false;
      if (filter === "action" && (!needsAction || isDone)) return false;
      if (filter === "all" && isDone) return false;
      if (!q) return true;
      const hay = `${t.klant_naam || ""} ${t.klant_email || ""} ${t.onderwerp || ""} ${t.voertuig_info || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [threads, lastByThread, filter, search]);

  const selectedThread = threads.find((t) => t.id === selectedId) || null;
  const lastIncoming = useMemo(
    () => [...emails].reverse().find((e) => e.richting === "inkomend"),
    [emails]
  );
  const lastEvent = emails[emails.length - 1];
  const clockActive = !!lastEvent && lastEvent.richting === "inkomend";
  const waitingHours = clockActive && lastIncoming ? hoursSince(lastIncoming.received_at) : null;
  const sev = waitingHours !== null ? sevOf(waitingHours) : null;

  const sendReply = async () => {
    if (!reply.trim() || !selectedThread) return;
    setSending(true);
    try {
      const subject = `Re: ${selectedThread.onderwerp || "Garantie"}`;
      const htmlBody = renderReplyHtml(reply.trim(), senderName);
      const { error: qErr } = await supabase.from("email_queue").insert({
        status: "pending",
        payload: {
          senderEmail: "garantie@auto-city.nl",
          senderName: "Autocity Garantie",
          to: [selectedThread.klant_email].filter(Boolean),
          subject,
          htmlBody,
        },
      });
      if (qErr) throw qErr;
      await supabase.from("garantie_emails").insert({
        thread_id: selectedThread.id,
        sender: senderName,
        sender_email: "garantie@auto-city.nl",
        subject, body: htmlBody,
        richting: "uitgaand",
        received_at: new Date().toISOString(),
        verstuurd_op: new Date().toISOString(),
        verstuurd_door: senderName,
      } as any);
      await supabase.from("garantie_email_threads")
        .update({ laatste_email_op: new Date().toISOString() })
        .eq("id", selectedThread.id);
      setReply("");
      await loadThread(selectedThread.id);
      await loadList();
      toast({ title: "Antwoord verstuurd", description: "Toegevoegd aan de e-mailwachtrij." });
    } catch (e: any) {
      toast({ title: "Versturen mislukt", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const logEvent = async () => {
    if (!eventText.trim() || !selectedThread) return;
    const label = eventDialog.type === "gebeld" ? "📞 Gebeld" : eventDialog.type === "bezoek" ? "📍 Bezoek" : "📝 Notitie";
    await supabase.from("garantie_emails").insert({
      thread_id: selectedThread.id,
      sender: senderName,
      subject: label,
      body: eventText.trim(),
      richting: "event",
      received_at: new Date().toISOString(),
    } as any);
    setEventText("");
    setEventDialog({ open: false, type: "notitie" });
    await loadThread(selectedThread.id);
    await loadList();
  };

  const closeThread = async () => {
    if (!selectedThread) return;
    await supabase.from("garantie_email_threads")
      .update({ thread_status: "afgerond" })
      .eq("id", selectedThread.id);
    toast({ title: "Thread afgerond" });
    await loadList();
  };

  const fetchSuggestion = async (hint?: string) => {
    if (!selectedThread) return;
    setAgentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("garantie-agent", {
        body: { action: "suggest", thread_id: selectedThread.id, hint: hint || "" },
      });
      if (error) throw error;
      setAgentSuggestion(((data as any)?.suggestion || "").trim());
      setAgentPregenerated(false);
    } catch (e: any) {
      toast({ title: "Agent-fout", description: e.message, variant: "destructive" });
    } finally {
      setAgentLoading(false);
    }
  };

  const askAgent = async () => {
    if (!selectedThread || !agentQuestion.trim()) return;
    const q = agentQuestion.trim();
    setAgentAsking(true);
    setAgentChat((prev) => [...prev, { role: "user", content: q }]);
    setAgentQuestion("");
    try {
      const { data, error } = await supabase.functions.invoke("garantie-agent", {
        body: { action: "chat", thread_id: selectedThread.id, question: q },
      });
      if (error) throw error;
      const answer = ((data as any)?.answer || "").trim();
      setAgentChat((prev) => [...prev, { role: "assistant", content: answer }]);
      const v = agentViewRef.current;
      if (!(v.open && v.tab === "overleg")) setChatUnread((n) => n + 1);
    } catch (e: any) {
      toast({ title: "Agent-fout", description: e.message, variant: "destructive" });
      setAgentChat((prev) => prev.slice(0, -1));
    } finally {
      setAgentAsking(false);
    }
  };

  return (
    <DashboardLayout>
      <AsPage>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Garantie · Inbox</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Reageer binnen 24 uur — de klok stopt bij een antwoord of gebeurtenis.</p>
          </div>
        </div>

        <AsCard className="overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)_320px] min-h-[70vh] lg:h-[calc(100vh-190px)]">
            {/* ============ Threadlijst ============ */}
            <div className="border-r border-slate-100 flex flex-col min-h-0">
              {/* Kop-balk */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#f4f6f9] border-b border-[#e2e6ec]">
                <div className="h-[26px] w-[26px] rounded-md bg-blue-50 text-blue-600 ring-1 ring-blue-100 flex items-center justify-center">
                  <Inbox className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-slate-900 leading-tight">Threads</div>
                  <div className="text-[10.5px] text-slate-500">{threads.length} open · reageer binnen 24u</div>
                </div>
              </div>
              <div className="p-3 border-b border-slate-100 space-y-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoek klant, kenteken…" className="h-8 pl-8 text-[13px]" />
                </div>
                <div className="inline-flex bg-slate-100 rounded-full p-0.5 w-full">
                  {(["action", "all", "done"] as Filter[]).map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={cn("flex-1 text-[11px] font-medium py-1 rounded-full transition",
                        filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
                      {f === "action" ? "Actie nodig" : f === "all" ? "Alles" : "Afgerond"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-h-0 max-h-[45vh] lg:max-h-none overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                {loadingList ? (
                  <div className="p-6 text-center text-slate-400"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                ) : filteredThreads.length === 0 ? (
                  <div className="p-6 text-center text-[12px] text-slate-400">Geen threads.</div>
                ) : filteredThreads.map((t) => {
                  const last = lastByThread.get(t.id);
                  const needsAction = !!last && last.richting === "inkomend" && t.thread_status !== "afgerond";
                  const h = needsAction && last ? hoursSince(last.received_at) : null;
                  const s = h !== null ? sevOf(h) : null;
                  return (
                    <button key={t.id} onClick={() => loadThread(t.id)}
                      className={cn("w-full text-left px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50 transition",
                        selectedId === t.id && "bg-blue-50/60")}>
                      <div className="flex items-start gap-2">
                        <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", s ? sevColor(s) : "bg-slate-300")} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <div className="text-[13px] font-semibold text-slate-900 truncate flex-1">{t.klant_naam || t.klant_email || "Onbekend"}</div>
                            {h !== null && (
                              <div className={cn("text-[11px] font-semibold tabular-nums", sevText(s!))}>{fmtWait(h)}</div>
                            )}
                          </div>
                          <div className="text-[12px] text-slate-600 truncate">{t.onderwerp || "(geen onderwerp)"}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{t.voertuig_info || ""}</div>
                          {s === "red" && needsAction && (
                            <div className="mt-1"><AsPill tone="red">reageer vandaag</AsPill></div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ============ Tijdlijn ============ */}
            <div className="flex flex-col min-w-0 min-h-0">
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#f4f6f9] border-b border-[#e2e6ec]">
                <div className="h-[26px] w-[26px] rounded-md bg-violet-50 text-violet-600 ring-1 ring-violet-100 flex items-center justify-center">
                  <MessagesSquare className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-slate-900 leading-tight">Gesprek</div>
                  <div className="text-[10.5px] text-slate-500 truncate">
                    {selectedThread ? (selectedThread.klant_naam || selectedThread.klant_email || "—") : "Selecteer een thread"}
                  </div>
                </div>
              </div>
              {!selectedThread ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-[13px]">Kies een thread links.</div>
              ) : (
                <>
                  <div className="p-4 border-b border-slate-100 flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-semibold text-[13px]">
                      {(selectedThread.klant_naam || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-slate-900">{selectedThread.klant_naam || "Onbekend"}</div>
                      <div className="text-[12px] text-slate-500 truncate">{selectedThread.klant_email}</div>
                      <div className="text-[12px] text-slate-500 truncate">{selectedThread.onderwerp}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {waitingHours !== null && (
                        <div className={cn("text-[12px] font-semibold tabular-nums", sevText(sev!))}>
                          ⏰ wacht {waitingHours}u op reactie
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEventDialog({ open: true, type: "gebeld" })}><Phone className="h-3 w-3 mr-1" />Gebeld</Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEventDialog({ open: true, type: "bezoek" })}><MapPin className="h-3 w-3 mr-1" />Bezoek</Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEventDialog({ open: true, type: "notitie" })}><StickyNote className="h-3 w-3 mr-1" />Notitie</Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={closeThread}><CheckCircle2 className="h-3 w-3 mr-1" />Afronden</Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/40">
                    {loadingThread ? (
                      <div className="text-center text-slate-400 py-8"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                    ) : emails.length === 0 ? (
                      <div className="text-center text-[12px] text-slate-400 py-8">Nog geen berichten.</div>
                    ) : emails.map((e) => {
                      if (e.richting === "event") {
                        return (
                          <div key={e.id} className="flex justify-center">
                            <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-800 text-[12px] rounded-full px-3 py-1">
                              <span className="font-medium">{sanitizeMailText(e.subject)}</span>
                              <span className="text-teal-700/80">· {sanitizeMailText(e.body)}</span>
                              <span className="text-teal-600/60">· {format(new Date(e.received_at), "d MMM HH:mm", { locale: nl })}</span>
                            </div>
                          </div>
                        );
                      }
                      const outgoing = e.richting === "uitgaand";
                      const cleaned = sanitizeMailText(e.body);
                      const { main, quoted } = splitQuotedReply(cleaned);
                      const isOpen = !!expandedQuoted[e.id];
                      return (
                        <div key={e.id} className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[78%] rounded-2xl px-4 py-3 shadow-sm text-[13.5px] leading-[1.65]",
                            outgoing ? "bg-blue-50 border border-blue-100 text-slate-900" : "bg-white border border-slate-200 text-slate-900")}>
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                              <div className="text-[11px] font-semibold text-slate-600 truncate">{e.sender || (outgoing ? senderName : "Klant")}</div>
                              <div className="text-[11px] text-slate-400 shrink-0">{format(new Date(e.received_at), "d MMM HH:mm", { locale: nl })}</div>
                            </div>
                            <div className="whitespace-pre-wrap break-words">{main || "(leeg bericht)"}</div>
                            {quoted && (
                              <div className="mt-2 pt-2 border-t border-slate-200/60">
                                <button
                                  onClick={() => setExpandedQuoted((p) => ({ ...p, [e.id]: !p[e.id] }))}
                                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                                >
                                  <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
                                  ··· {isOpen ? "Verberg eerdere berichten" : "Toon eerdere berichten"}
                                </button>
                                {isOpen && (
                                  <div className="mt-2 pl-3 border-l-2 border-slate-200 text-[12px] text-slate-500 whitespace-pre-wrap break-words">
                                    {quoted}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Strip + Compose */}
                  <div className="border-t border-slate-100 p-3 bg-white">
                    <button
                      type="button"
                      onClick={() => { setAgentTab("voorstel"); setAgentPanelOpen(true); }}
                      className={cn(
                        "w-full h-9 mb-2 px-3 rounded-md border flex items-center gap-2 text-[12px] transition",
                        agentSuggestion
                          ? "border-violet-200 bg-violet-50/70 text-violet-800 hover:bg-violet-50"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {agentLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Sparkles className="h-3.5 w-3.5 shrink-0" />}
                      <span className="font-medium truncate">
                        {agentLoading ? "Agent denkt na…" : agentSuggestion ? "AI-concept klaar" : "Vraag de agent om een voorstel"}
                      </span>
                      {agentDecision && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white border border-violet-200 text-violet-700 shrink-0">
                          {agentDecision.replace(/_/g, " ")}
                        </span>
                      )}
                      <span className="ml-auto text-[11px] font-semibold underline decoration-dotted shrink-0">
                        {agentSuggestion ? "Bekijken" : "Openen"}
                      </span>
                    </button>
                    <Textarea
                      ref={replyRef}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Schrijf een antwoord aan de klant…"
                      className="min-h-[90px] max-h-[40vh] text-[13px] resize-none border-slate-200 overflow-y-auto"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-[11px] text-slate-400">
                        Vanaf <span className="font-mono">garantie@auto-city.nl</span> · handtekening: {senderName}
                      </div>
                      <Button size="sm" onClick={sendReply} disabled={!reply.trim() || sending} className="h-8">
                        {sending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                        Versturen
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ============ Contextpaneel ============ */}
            <div className="border-l border-slate-100 bg-slate-50/30 flex flex-col min-h-0">
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#f4f6f9] border-b border-[#e2e6ec]">
                <div className="h-[26px] w-[26px] rounded-md bg-teal-50 text-teal-600 ring-1 ring-teal-100 flex items-center justify-center">
                  <PanelRight className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-slate-900 leading-tight">Context & agent</div>
                  <div className="text-[10.5px] text-slate-500">Voertuig · claim · overleg</div>
                </div>
              </div>
              <div className="p-4 space-y-3 flex flex-col flex-1 min-h-0">
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Car className="h-3.5 w-3.5" />Voertuig</div>
                <div className="bg-white border border-slate-200 rounded-lg p-3 text-[12px] space-y-1">
                  {selectedThread?.voertuig_info ? (
                    <div className="text-slate-800">{selectedThread.voertuig_info}</div>
                  ) : claim?.vehicles ? (
                    <>
                      <div className="text-[13px] font-semibold text-slate-900">{claim.vehicles.brand} {claim.vehicles.model}</div>
                      {claim.vehicles.license_number && <AsMono className="text-slate-700">{claim.vehicles.license_number}</AsMono>}
                      {claim.vehicles.sold_date && <div className="text-slate-500">gekocht op {format(new Date(claim.vehicles.sold_date), "d MMM yyyy", { locale: nl })}</div>}
                    </>
                  ) : (
                    <div className="text-slate-400 italic">Geen voertuig gekoppeld.</div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Claim</div>
                <div className="bg-white border border-slate-200 rounded-lg p-3 text-[12px]">
                  {claim ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AsPill tone={claim.claim_status === "resolved" ? "green" : "amber"}>{claim.claim_status}</AsPill>
                        <span className="text-slate-400">· {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true, locale: nl })}</span>
                      </div>
                      <div className="text-slate-700 line-clamp-3">{claim.description}</div>
                      <div className="pt-1.5"><WarrantyScheduleAction claimId={claim.id} /></div>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic">Nog geen claim gekoppeld.</div>
                  )}
                </div>
              </div>

              {/* Overleg met agent — compacte ingang naar de slide-over */}
              <button
                type="button"
                disabled={!selectedThread}
                onClick={() => { setAgentTab("overleg"); setAgentPanelOpen(true); setChatUnread(0); }}
                className="w-full text-left rounded-lg border border-violet-100 bg-gradient-to-br from-violet-50/70 to-white p-3 hover:border-violet-300 transition-colors disabled:opacity-60"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 uppercase tracking-wide">
                  <Sparkles className="h-3.5 w-3.5" /> Overleg met agent
                  {chatUnread > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-violet-600 text-white text-[10px] font-bold">{chatUnread}</span>
                  )}
                </div>
                <div className="mt-1 text-[12px] text-slate-600">
                  {agentChat.length > 0 ? (
                    <>
                      <span className="text-slate-400">{agentChat.length} bericht{agentChat.length === 1 ? "" : "en"} · </span>
                      <span className="line-clamp-2">{agentChat[agentChat.length - 1].content}</span>
                    </>
                  ) : (
                    <span className="italic text-slate-400">Nog geen overleg — stel een vraag over deze casus.</span>
                  )}
                </div>
              </button>
              </div>
            </div>
          </div>
        </AsCard>

        {/* Event dialog */}
        <Dialog open={eventDialog.open} onOpenChange={(o) => setEventDialog((d) => ({ ...d, open: o }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gebeurtenis loggen</DialogTitle>
              <DialogDescription>Stopt de 24-uursklok en wordt zichtbaar in de tijdlijn.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["gebeld", "bezoek", "notitie"] as const).map((t) => (
                  <Button key={t} size="sm" variant={eventDialog.type === t ? "default" : "outline"} onClick={() => setEventDialog((d) => ({ ...d, type: t }))}>
                    {t === "gebeld" ? "📞 Gebeld" : t === "bezoek" ? "📍 Bezoek" : "📝 Notitie"}
                  </Button>
                ))}
              </div>
              <Textarea value={eventText} onChange={(e) => setEventText(e.target.value)} placeholder="Wat is er gebeurd?" className="min-h-[100px]" />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEventDialog({ open: false, type: "notitie" })}>Annuleren</Button>
              <Button onClick={logEvent} disabled={!eventText.trim()}>Loggen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============ Slide-over: Garantie Agent ============ */}
        <Sheet open={agentPanelOpen} onOpenChange={setAgentPanelOpen}>
          <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col">
            <SheetHeader className="px-5 py-4 border-b border-slate-100 text-left">
              <SheetTitle className="text-[15px] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                {selectedThread?.klant_naam || selectedThread?.klant_email || "Garantie Agent"}
              </SheetTitle>
              <SheetDescription className="text-[12px]">
                {selectedThread?.voertuig_info
                  || (claim?.vehicles ? `${claim.vehicles.brand} ${claim.vehicles.model}${claim.vehicles.license_number ? ` · ${claim.vehicles.license_number}` : ""}` : "Geen voertuig gekoppeld")}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <section>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">📩 De klacht</div>
                <div className="bg-white border border-slate-200 rounded-lg p-3 text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap break-words max-h-[240px] overflow-y-auto">
                  {lastIncoming ? (splitQuotedReply(sanitizeMailText(lastIncoming.body)).main || "(leeg bericht)") : "Geen inkomende e-mail."}
                </div>
              </section>

              <section>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">🔍 Analyse</div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[12.5px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {agentAnalysis || <span className="italic text-slate-400">Nog geen analyse.</span>}
                </div>
              </section>

              <section>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">⚖️ Beslissing</div>
                {agentDecision ? (
                  <span className="inline-flex items-center text-[12px] font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                    {agentDecision.replace(/_/g, " ")}
                  </span>
                ) : (
                  <div className="text-[12px] italic text-slate-400">Nog geen beslissing.</div>
                )}
              </section>

              <section>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">✉️ Concept-antwoord</div>
                <div className="bg-white border border-violet-200 rounded-lg p-3.5 text-[13.5px] text-slate-900 leading-[1.7] whitespace-pre-wrap break-words">
                  {agentSuggestion || <span className="italic text-slate-400">Nog geen concept — haal hieronder een voorstel op.</span>}
                </div>
              </section>
            </div>

            <div className="border-t border-slate-100 p-3 bg-white space-y-2">
              {agentSuggestion ? (
                <>
                  <Button
                    className="w-full h-9 text-[12.5px]"
                    onClick={() => {
                      setReply(agentSuggestion);
                      setAgentPanelOpen(false);
                      setTimeout(() => replyRef.current?.focus(), 120);
                    }}
                  >
                    Gebruik voorstel
                  </Button>
                  <div className="flex items-center gap-2">
                    <Input
                      value={agentHint}
                      onChange={(e) => setAgentHint(e.target.value)}
                      placeholder="Bijstelling (bv. 'kort houden')"
                      className="h-8 text-[11.5px] flex-1"
                    />
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] shrink-0" disabled={agentLoading} onClick={() => fetchSuggestion(agentHint)}>
                      {agentLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                      Herschrijf
                    </Button>
                  </div>
                </>
              ) : (
                <Button className="w-full h-9 text-[12.5px]" disabled={agentLoading || !selectedThread} onClick={() => fetchSuggestion()}>
                  {agentLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
                  Voorstel ophalen
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

      </AsPage>
    </DashboardLayout>
  );
};

export default GarantieInbox;
