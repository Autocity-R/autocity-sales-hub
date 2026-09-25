import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, X } from "lucide-react";
import {
  LeenReden,
  REDEN_LABELS,
  Uitlening,
  formatNL,
  fromLocalInput,
  leenautoInnemen,
  leenautoUitlenen,
  toLocalInput,
} from "@/services/leenautoService";

export interface UitleenDefaults {
  contactId?: string | null;
  klantNaam?: string;
  klantTelefoon?: string;
  klantEmail?: string;
  warrantyClaimId?: string | null;
  reden?: LeenReden;
}

interface UitleenDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loanCarId: string;
  loanCarLabel: string;
  defaults?: UitleenDefaults;
  /** Auto stond al op uitgeleend van vóór de registratie. */
  achteraf?: boolean;
  /** Verberg claimkeuze (bijv. als de claim al vastligt). */
  lockClaim?: boolean;
  onDone?: () => void;
}

export const LeenautoUitleenDialog: React.FC<UitleenDialogProps> = ({
  open, onOpenChange, loanCarId, loanCarLabel, defaults, achteraf, lockClaim, onDone,
}) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);
  const [naam, setNaam] = useState("");
  const [tel, setTel] = useState("");
  const [mail, setMail] = useState("");
  const [adres, setAdres] = useState("");
  const [pc, setPc] = useState("");
  const [plaats, setPlaats] = useState("");
  const [reden, setReden] = useState<LeenReden>("overig");
  const [claimId, setClaimId] = useState<string>("none");
  const [uit, setUit] = useState("");
  const [terug, setTerug] = useState("");
  const [notities, setNotities] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setContactId(defaults?.contactId || null);
    setNaam(defaults?.klantNaam || "");
    setTel(defaults?.klantTelefoon || "");
    setMail(defaults?.klantEmail || "");
    setAdres(""); setPc(""); setPlaats("");
    setReden(defaults?.reden || (defaults?.warrantyClaimId ? "garantie" : "overig"));
    setClaimId(defaults?.warrantyClaimId || "none");
    setUit(toLocalInput(new Date()));
    setTerug("");
    setNotities(achteraf ? "Achteraf geregistreerd" : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { data: contacts = [] } = useQuery({
    queryKey: ["leenauto-contact-search", search],
    enabled: open && search.trim().length >= 2,
    queryFn: async () => {
      const s = search.trim().replace(/[,%()]/g, " ");
      const { data } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, company_name, phone, email, address_street, address_number, address_postal_code, address_city")
        .or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,company_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`)
        .limit(8);
      return data || [];
    },
  });

  const { data: claims = [] } = useQuery({
    queryKey: ["leenauto-open-claims"],
    enabled: open && !lockClaim,
    queryFn: async () => {
      const { data } = await supabase
        .from("warranty_claims")
        .select("id, manual_customer_name, manual_license_number, created_at, claim_status, vehicles(license_number, brand, model)")
        .neq("claim_status", "resolved")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data || []) as any[];
    },
  });

  const pickContact = (c: any) => {
    setContactId(c.id);
    setNaam(`${c.first_name || ""} ${c.last_name || ""}`.trim() || c.company_name || "");
    setTel(c.phone || "");
    setMail(c.email || "");
    setAdres(`${c.address_street || ""} ${c.address_number || ""}`.trim());
    setPc(c.address_postal_code || "");
    setPlaats(c.address_city || "");
    setSearch("");
  };

  const submit = async () => {
    if (!naam.trim()) return toast({ title: "Naam klant is verplicht", variant: "destructive" });
    if (!tel.trim() && !mail.trim()) return toast({ title: "Telefoon of e-mail is verplicht", variant: "destructive" });
    const uitDate = fromLocalInput(uit);
    if (!uitDate) return toast({ title: "Uitgiftemoment is verplicht", variant: "destructive" });
    const terugDate = fromLocalInput(terug);
    setBusy(true);
    try {
      await leenautoUitlenen({
        loanCarId, contactId, klantNaam: naam, klantTelefoon: tel, klantEmail: mail,
        klantAdres: adres, klantPostcode: pc, klantPlaats: plaats,
        warrantyClaimId: claimId === "none" ? null : claimId,
        reden, uitgeleendOp: uitDate, verwachtTerugOp: terugDate, notities,
      });
      toast({ title: "Leenauto uitgeleend", description: `${loanCarLabel} aan ${naam}` });
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast({ title: "Uitlenen mislukt", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{achteraf ? "Uitlening achteraf vastleggen" : "Leenauto uitlenen"}</DialogTitle>
          <DialogDescription>{loanCarLabel}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Klant zoeken in contacten</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Naam, telefoon of e-mail…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {contacts.length > 0 && (
              <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
                {contacts.map((c: any) => (
                  <button key={c.id} type="button" onClick={() => pickContact(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
                    <div className="font-medium">{`${c.first_name || ""} ${c.last_name || ""}`.trim() || c.company_name}</div>
                    <div className="text-xs text-muted-foreground">{[c.phone, c.email, c.address_city].filter(Boolean).join(" · ")}</div>
                  </button>
                ))}
              </div>
            )}
            {contactId && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Gekoppeld aan contact
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2" onClick={() => setContactId(null)}>
                  <X className="h-3 w-3 mr-1" /> ontkoppelen
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1"><Label htmlFor="lk-naam">Naam klant *</Label><Input id="lk-naam" value={naam} onChange={(e) => setNaam(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="lk-tel">Telefoon</Label><Input id="lk-tel" value={tel} onChange={(e) => setTel(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="lk-mail">E-mail</Label><Input id="lk-mail" type="email" value={mail} onChange={(e) => setMail(e.target.value)} /></div>
            <p className="sm:col-span-2 text-xs text-muted-foreground -mt-1">Telefoon óf e-mail is verplicht.</p>
            <div className="sm:col-span-2 space-y-1"><Label htmlFor="lk-adres">Adres</Label><Input id="lk-adres" value={adres} onChange={(e) => setAdres(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="lk-pc">Postcode</Label><Input id="lk-pc" value={pc} onChange={(e) => setPc(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="lk-plaats">Plaats</Label><Input id="lk-plaats" value={plaats} onChange={(e) => setPlaats(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Reden</Label>
              <Select value={reden} onValueChange={(v) => setReden(v as LeenReden)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(REDEN_LABELS) as LeenReden[]).map((r) => <SelectItem key={r} value={r}>{REDEN_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!lockClaim && (
              <div className="space-y-1">
                <Label>Garantieclaim (optioneel)</Label>
                <Select value={claimId} onValueChange={setClaimId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen claim</SelectItem>
                    {claims.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {(c.vehicles?.license_number || c.manual_license_number || "—")} · {c.manual_customer_name || `${c.vehicles?.brand || ""} ${c.vehicles?.model || ""}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1"><Label htmlFor="lk-uit">Uitgifte (datum + tijd) *</Label><Input id="lk-uit" type="datetime-local" value={uit} onChange={(e) => setUit(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="lk-terug">Verwacht terug</Label><Input id="lk-terug" type="datetime-local" value={terug} onChange={(e) => setTerug(e.target.value)} /></div>
          </div>
          {achteraf && <p className="text-xs text-muted-foreground">Vul het (geschatte) moment van uitgifte in.</p>}
          <div className="space-y-1"><Label htmlFor="lk-not">Notitie</Label><Textarea id="lk-not" rows={2} value={notities} onChange={(e) => setNotities(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annuleren</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Bezig…" : "Uitlenen"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface InleverDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  uitlening: Pick<Uitlening, "id" | "klant_naam" | "uitgeleend_op"> | null;
  loanCarLabel: string;
  onDone?: () => void;
}

export const LeenautoInleverDialog: React.FC<InleverDialogProps> = ({ open, onOpenChange, uitlening, loanCarLabel, onDone }) => {
  const { toast } = useToast();
  const [moment, setMoment] = useState("");
  const [notitie, setNotitie] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setMoment(toLocalInput(new Date())); setNotitie(""); } }, [open]);

  const submit = async () => {
    const d = fromLocalInput(moment);
    if (!uitlening || !d) return;
    setBusy(true);
    try {
      await leenautoInnemen(uitlening.id, d, notitie);
      toast({ title: "Leenauto ingeleverd", description: loanCarLabel });
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast({ title: "Inleveren mislukt", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Leenauto inleveren</DialogTitle>
          <DialogDescription>
            {loanCarLabel}{uitlening ? ` — ${uitlening.klant_naam}, sinds ${formatNL(uitlening.uitgeleend_op)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label htmlFor="li-moment">Ingeleverd op (datum + tijd)</Label><Input id="li-moment" type="datetime-local" value={moment} onChange={(e) => setMoment(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="li-not">Notitie</Label><Textarea id="li-not" rows={2} value={notitie} onChange={(e) => setNotitie(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annuleren</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Bezig…" : "Inleveren"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
