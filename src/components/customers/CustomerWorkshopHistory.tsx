import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, FileText, Loader2, Wrench } from "lucide-react";
import { getCustomerWorkshopHistory } from "@/services/customerWorkshopService";
import { getInvoiceSignedUrl, eur } from "@/services/workshopInvoiceService";
import { DISCIPLINE_ICON, DISCIPLINE_LABELS, STATUS_COLORS, STATUS_LABELS, WorkOrderDiscipline, WorkOrderStatus } from "@/components/werkplaats/workOrderTypes";
import { useToast } from "@/hooks/use-toast";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" }) : "—";

interface Props { contactId: string }

const CustomerWorkshopHistory: React.FC<Props> = ({ contactId }) => {
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["customer-workshop-history", contactId],
    queryFn: () => getCustomerWorkshopHistory(contactId),
  });

  const openInvoice = async (path: string | null) => {
    if (!path) {
      toast({ title: "Geen PDF beschikbaar", variant: "destructive" });
      return;
    }
    const url = await getInvoiceSignedUrl(path);
    if (!url) {
      toast({ title: "PDF kon niet worden geopend", variant: "destructive" });
      return;
    }
    window.open(url, "_blank", "noopener");
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Werkplaats-historie laden…
      </div>
    );
  }

  const { vehicles = [], orders = [], invoices = [] } = data || {};

  if (!vehicles.length && !orders.length && !invoices.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nog geen werkplaats-historie voor deze klant.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="h-4 w-4" /> Voertuigen ({vehicles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen voertuigen geregistreerd.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {vehicles.map((v) => (
                <div key={v.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="font-semibold">{v.brand} {v.model}</div>
                  <div className="text-xs font-mono text-muted-foreground">{v.license_number || "—"}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4" /> Werkplaats-afspraken ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen afspraken gevonden.</p>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="text-sm text-muted-foreground w-28">{fmtDate(o.planned_at || o.created_at)}</div>
                <div className="flex-1 min-w-[12rem]">
                  <div className="text-sm font-medium">
                    {DISCIPLINE_ICON[o.discipline as WorkOrderDiscipline] || "•"}{" "}
                    {DISCIPLINE_LABELS[o.discipline as WorkOrderDiscipline] || o.discipline}
                  </div>
                  <div className="text-xs text-muted-foreground">{o.description || "—"}</div>
                  {o.vehicle && (
                    <div className="text-xs text-muted-foreground">
                      {o.vehicle.brand} {o.vehicle.model} · {o.vehicle.license_number || "—"}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className={STATUS_COLORS[o.status as WorkOrderStatus] || ""}>
                  {STATUS_LABELS[o.status as WorkOrderStatus] || o.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Facturen ({invoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen facturen gevonden.</p>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="text-sm text-muted-foreground w-28">{fmtDate(inv.created_at)}</div>
                <div className="flex-1 min-w-[10rem] font-mono text-sm">{inv.invoice_number || "—"}</div>
                <div className="text-sm font-semibold">{eur(Number(inv.total) || 0)}</div>
                <Badge variant="outline">{inv.status || "concept"}</Badge>
                <Button size="sm" variant="outline" onClick={() => openInvoice(inv.pdf_path)}>
                  PDF openen
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerWorkshopHistory;
