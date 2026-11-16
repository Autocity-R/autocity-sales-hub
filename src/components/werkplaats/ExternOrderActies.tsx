import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ban, Eye, FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { featureAccess } from "@/lib/routeAccess";
import { externInvoiceDraft, FACTUUR_NIET_NODIG_REDENEN } from "@/lib/externFactuur";
import WorkshopInvoiceDialog from "@/components/werkplaats/WorkshopInvoiceDialog";
import { TaskDetailSheet } from "@/components/werkplaats/TaskDetailSheet";
import type { InvoiceDraft } from "@/services/workshopInvoiceService";

/** Wie mag een externe order alsnog factureren of als "geen factuur nodig" wegklikken (gelijk aan de RPC-rolcheck). */
export const useMagExternFactureren = () => {
  const { userRole, isAdmin } = useAuth();
  return isAdmin || featureAccess["handmatige-facturen"](userRole);
};

/** Verplichte reden kiezen en de order via de RPC als "geen factuur nodig" markeren. */
export const GeenFactuurNodigDialog: React.FC<{
  order: { id: string; kenteken?: string | null; klant?: string | null } | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ order, onClose, onDone }) => {
  const [reden, setReden] = useState("");
  const [toelichting, setToelichting] = useState("");
  const [bezig, setBezig] = useState(false);

  const markeer = async () => {
    if (!order || !reden) return;
    setBezig(true);
    const { error } = await (supabase as any).rpc("werkorder_factuur_niet_nodig", {
      p_work_order_id: order.id, p_reden: reden, p_toelichting: toelichting || null,
    });
    setBezig(false);
    if (error) { toast({ title: "Wegklikken mislukt", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Weggeklikt: geen factuur nodig", description: "Terugzetten kan bij Facturen → Nog te factureren → Geen factuur nodig." });
    setReden(""); setToelichting("");
    onDone();
  };

  return (
    <Dialog open={!!order} onOpenChange={(v) => { if (!v) { setReden(""); setToelichting(""); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Geen factuur nodig</DialogTitle>
          <DialogDescription>
            {[order?.kenteken, order?.klant].filter(Boolean).join(" · ") || "Werkorder"} — kies een verplichte reden.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={reden} onValueChange={setReden}>
            <SelectTrigger><SelectValue placeholder="Kies een reden…" /></SelectTrigger>
            <SelectContent>
              {FACTUUR_NIET_NODIG_REDENEN.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Toelichting (optioneel)" value={toelichting} onChange={e => setToelichting(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Annuleren</Button>
            <Button disabled={!reden || bezig} onClick={markeer}>
              {bezig && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Markeren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ORDER_SELECT =
  "id, status, discipline, description, part, parts, photos, origin, warranty_claim_id, external_customer, vehicle_id, branch," +
  " vehicle:vehicles!work_orders_vehicle_id_fkey(id, brand, model, year, license_number, vin, mileage, color)";

/**
 * Knoppen bij een goedgekeurde externe werkorder zonder factuur (directie-cockpit / controleblok):
 * Bekijken (iedereen die het blok ziet), Factuur maken en Geen factuur nodig (alleen factureer-rollen).
 */
export const ExternOrderKnoppen: React.FC<{
  orderId: string; kenteken?: string | null; klant?: string | null; onChanged?: () => void;
}> = ({ orderId, kenteken, klant, onChanged }) => {
  const mayEdit = useMagExternFactureren();
  const [order, setOrder] = useState<any | null>(null);
  const [laden, setLaden] = useState(false);
  const [bekijk, setBekijk] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceDraft | null>(null);
  const [weg, setWeg] = useState(false);

  const haal = async () => {
    if (order) return order;
    setLaden(true);
    const { data, error } = await (supabase as any).from("work_orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();
    setLaden(false);
    if (error || !data) { toast({ title: "Order niet gevonden", description: error?.message, variant: "destructive" }); return null; }
    setOrder(data);
    return data;
  };

  const openBekijk = async () => { if (await haal()) setBekijk(true); };
  const openFactuur = async () => { const o = await haal(); if (o) { setBekijk(false); setInvoice(externInvoiceDraft(o)); } };
  const openWeg = () => { setBekijk(false); setWeg(true); };
  const klaar = () => { setWeg(false); setInvoice(null); setBekijk(false); onChanged?.(); };

  const acties = mayEdit ? (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={openFactuur}><FileText className="h-3.5 w-3.5 mr-1" />Factuur maken</Button>
      <Button size="sm" variant="outline" onClick={openWeg}><Ban className="h-3.5 w-3.5 mr-1" />Geen factuur nodig</Button>
    </div>
  ) : null;

  return (
    <>
      <div className="ml-auto flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11.5px]" onClick={openBekijk} disabled={laden}>
          {laden ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Eye className="h-3.5 w-3.5 mr-1" />}Bekijken
        </Button>
        {mayEdit && (
          <>
            <Button size="sm" variant="outline" className="h-7 px-2 text-[11.5px]" onClick={openFactuur} disabled={laden}>
              <FileText className="h-3.5 w-3.5 mr-1" />Factuur maken
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11.5px]" onClick={openWeg}>
              <Ban className="h-3.5 w-3.5 mr-1" />Weg
            </Button>
          </>
        )}
      </div>

      <TaskDetailSheet open={bekijk} onOpenChange={setBekijk} workOrder={order} actions={acties} />

      <WorkshopInvoiceDialog
        open={!!invoice}
        onOpenChange={(v) => !v && setInvoice(null)}
        initial={invoice}
        onSaved={klaar}
      />

      <GeenFactuurNodigDialog order={weg ? { id: orderId, kenteken, klant } : null} onClose={() => setWeg(false)} onDone={klaar} />
    </>
  );
};

export default ExternOrderKnoppen;
