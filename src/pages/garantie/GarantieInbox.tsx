import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Search, Send, Sparkles, CheckCircle2, Phone, MapPin, StickyNote, Link2, Shield, Car } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { AsPage, AsCard, AsPill, AsMono } from "@/components/aftersales/ui";
import { cn } from "@/lib/utils";

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

const stripHtml = (s: string | null) => (s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const salespersonSignatureHtml = (name: string) => `
<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <div style="font-weight:600;color:#0f172a;font-size:14px">${name}</div>
  <div style="font-size:13px;color:#475569;margin-top:2px">Autocity Automotive Group</div>
  <div style="font-size:13px;color:#475569;margin-top:2px">📞 010 262 3980 · 🌐 <a style="color:#f97316;text-decoration:none" href="https://www.auto-city.nl">www.auto-city.nl</a></div>
</div>`;

const renderReplyHtml = (body: string, signatureName: string) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;font-size:14px;line-height:1.6">
  ${body.split(/\n\n+/).map(p => `<p style="margin:0 0 12px">${p.replace(/\n/g, "<br/>")}</p>`).join("")}
  ${salespersonSignatureHtml(signatureName)}
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
  const [linkDialog, setLinkDialog] = useState(false);
  const [claimSearch, setClaimSearch] = useState("");
  const [claimResults, setClaimResults] = useState<Claim[]>([]);

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

  const searchClaims = async (q: string) => {
    setClaimSearch(q);
    if (q.length < 2) { setClaimResults([]); return; }
    const { data } = await supabase.from("warranty_claims")
      .select("id, claim_status, description, created_at, vehicle_id, manual_vehicle_brand, manual_vehicle_model, manual_license_number, vehicles:vehicle_id(brand, model, license_number, vin, sold_date)")
      .or(`manual_customer_name.ilike.%${q}%,manual_license_number.ilike.%${q}%,description.ilike.%${q}%`)
      .order("created_at", { ascending: false }).limit(20);
    setClaimResults((data as any) || []);
  };

  const linkClaim = async (id: string) => {
    if (!selectedThread) return;
    await supabase.from("garantie_email_threads").update({ warranty_claim_id: id }).eq("id", selectedThread.id);
    setLinkDialog(false);
    await loadList();
    await loadThread(selectedThread.id);
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
          <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)_320px] min-h-[70vh]">
            {/* ============ Threadlijst ============ */}
            <div className="border-r border-slate-100 flex flex-col">
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
              <div className="flex-1 overflow-y-auto">
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
                              <div className={cn("text-[11px] font-semibold tabular-nums", sevText(s!))}>{h}u</div>
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
            <div className="flex flex-col min-w-0">
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
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setLinkDialog(true)}><Link2 className="h-3 w-3 mr-1" />Claim</Button>
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
                              <span className="font-medium">{e.subject}</span>
                              <span className="text-teal-700/80">· {e.body}</span>
                              <span className="text-teal-600/60">· {format(new Date(e.received_at), "d MMM HH:mm", { locale: nl })}</span>
                            </div>
                          </div>
                        );
                      }
                      const outgoing = e.richting === "uitgaand";
                      return (
                        <div key={e.id} className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-[13px] leading-relaxed",
                            outgoing ? "bg-blue-50 border border-blue-100 text-slate-900" : "bg-white border border-slate-200 text-slate-900")}>
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <div className="text-[11px] font-semibold text-slate-500">{e.sender || (outgoing ? senderName : "Klant")}</div>
                              <div className="text-[11px] text-slate-400">{format(new Date(e.received_at), "d MMM HH:mm", { locale: nl })}</div>
                            </div>
                            <div className="whitespace-pre-wrap break-words">{stripHtml(e.body)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Compose */}
                  <div className="border-t border-slate-100 p-3 bg-white">
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Schrijf een antwoord aan de klant…"
                      className="min-h-[90px] text-[13px] resize-none border-slate-200"
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
            <div className="border-l border-slate-100 p-4 space-y-3 bg-slate-50/30">
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
                    </div>
                  ) : (
                    <div className="text-slate-400 italic">Nog geen claim gekoppeld.</div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-100 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-violet-700 uppercase tracking-wide flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Garantie Agent</div>
                <div className="text-[12px] text-slate-600 mt-1.5 leading-relaxed">
                  Tekstvoorstellen en overleg komen in de volgende stap.
                </div>
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

        {/* Link claim dialog */}
        <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Koppel garantieclaim</DialogTitle></DialogHeader>
            <Input value={claimSearch} onChange={(e) => searchClaims(e.target.value)} placeholder="Zoek op klant, kenteken of omschrijving…" />
            <div className="max-h-[300px] overflow-y-auto space-y-1 mt-2">
              {claimResults.map((c) => (
                <button key={c.id} onClick={() => linkClaim(c.id)} className="w-full text-left p-2.5 border border-slate-200 rounded-md hover:bg-slate-50">
                  <div className="text-[13px] font-medium">{c.vehicles?.brand || c.manual_vehicle_brand} {c.vehicles?.model || c.manual_vehicle_model} · <span className="font-mono">{c.vehicles?.license_number || c.manual_license_number}</span></div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">{c.description}</div>
                </button>
              ))}
              {claimSearch.length >= 2 && claimResults.length === 0 && <div className="text-[12px] text-slate-400 py-4 text-center">Geen resultaten.</div>}
            </div>
          </DialogContent>
        </Dialog>
      </AsPage>
    </DashboardLayout>
  );
};

export default GarantieInbox;
