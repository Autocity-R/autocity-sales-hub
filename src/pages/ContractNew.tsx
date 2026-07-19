import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCustomerSelector } from "@/components/customers/SearchableCustomerSelector";
import { Contact } from "@/types/customer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowLeft, ShieldCheck, Save } from "lucide-react";
import {
  WARRANTY_PACKAGE_OPTIONS,
  createContractV2,
} from "@/services/contractV2Service";

interface VehicleRow {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  license_number: string | null;
  vin: string | null;
  mileage: number | null;
  color: string | null;
  branch: string;
  status: string | null;
  selling_price: number | null;
  details: any;
  customer_id: string | null;
}

const branchLabel = (code: string) =>
  code === "heerhugowaard" ? "Heerhugowaard" : "Rotterdam";

const fmtEur = (n: number) =>
  new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(isFinite(n) ? n : 0);

export default function ContractNew() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const vehicleId = params.get("vehicleId") ?? "";

  const [vehicle, setVehicle] = useState<VehicleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState<string>("");
  const [customer, setCustomer] = useState<Contact | null>(null);
  const [salePriceEx, setSalePriceEx] = useState<string>("");
  const [btwType, setBtwType] = useState<"marge" | "btw">("marge");
  const [warrantyCode, setWarrantyCode] = useState<string>("");
  const [warrantyPrice, setWarrantyPrice] = useState<string>("0");
  const [tradeInEnabled, setTradeInEnabled] = useState(false);
  const [tradeInDesc, setTradeInDesc] = useState("");
  const [tradeInLicense, setTradeInLicense] = useState("");
  const [tradeInValue, setTradeInValue] = useState<string>("0");
  const [specialTerms, setSpecialTerms] = useState("");
  const [contractType, setContractType] = useState<"b2b" | "b2c">("b2c");

  const existingWarrantyPrice: number = Number(
    vehicle?.details?.warrantyPackagePrice || 0,
  );
  const hasExistingWarranty = existingWarrantyPrice > 0;
  const existingWarrantyName: string =
    vehicle?.details?.warrantyPackageName || vehicle?.details?.warrantyPackage || "";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!vehicleId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          "id, brand, model, year, license_number, vin, mileage, color, branch, status, selling_price, details, customer_id",
        )
        .eq("id", vehicleId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        toast({
          title: "Voertuig niet gevonden",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      setVehicle(data as VehicleRow);
      // Prefill
      if (data.selling_price) setSalePriceEx(String(data.selling_price));
      const bmDetail = (data.details as any)?.btwMarge;
      if (bmDetail === "btw" || bmDetail === "marge") setBtwType(bmDetail);
      if (data.status === "verkocht_b2b") setContractType("b2b");
      if (data.customer_id) setCustomerId(data.customer_id);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, toast]);

  const total = useMemo(() => {
    const s = parseFloat(salePriceEx) || 0;
    const w = hasExistingWarranty
      ? existingWarrantyPrice
      : parseFloat(warrantyPrice) || 0;
    const t = tradeInEnabled ? parseFloat(tradeInValue) || 0 : 0;
    return s + w - t;
  }, [
    salePriceEx,
    warrantyPrice,
    tradeInValue,
    tradeInEnabled,
    hasExistingWarranty,
    existingWarrantyPrice,
  ]);

  const canSave =
    !!vehicle &&
    !!customerId &&
    !!salePriceEx &&
    parseFloat(salePriceEx) > 0 &&
    !saving;

  async function handleSave() {
    if (!vehicle) return;
    setSaving(true);
    const selectedPkg = WARRANTY_PACKAGE_OPTIONS.find(
      (p) => p.code === warrantyCode,
    );
    const res = await createContractV2({
      vehicleId: vehicle.id,
      customerId,
      contractType,
      salePriceEx: parseFloat(salePriceEx) || 0,
      btwType,
      warrantyPackage: hasExistingWarranty
        ? undefined
        : warrantyCode || undefined,
      warrantyPackageName: hasExistingWarranty
        ? undefined
        : selectedPkg?.name,
      warrantyPrice: hasExistingWarranty
        ? undefined
        : parseFloat(warrantyPrice) || 0,
      tradeInVehicle: tradeInEnabled
        ? {
            description: tradeInDesc || undefined,
            licenseNumber: tradeInLicense || undefined,
            value: parseFloat(tradeInValue) || 0,
          }
        : null,
      tradeInValue: tradeInEnabled ? parseFloat(tradeInValue) || 0 : 0,
      specialTerms: specialTerms || undefined,
    });
    setSaving(false);
    if (res.error) {
      if (res.error === "warranty_already_registered") {
        toast({
          title: "Garantie al geregistreerd",
          description: `Er staat al een pakket op dit voertuig (${res.existing?.name ?? ""} – €${res.existing?.price ?? 0}). Corrigeren kan uitsluitend via het voertuig-detail.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Opslaan mislukt",
          description: res.detail || res.error,
          variant: "destructive",
        });
      }
      return;
    }
    toast({
      title: "Concept opgeslagen",
      description: `Contract ${res.contract?.contract_number} aangemaakt.`,
    });
    navigate(-1);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">Laden…</div>
      </DashboardLayout>
    );
  }

  if (!vehicle) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <p>Voertuig niet gevonden.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <PageHeader
            title="Nieuw koopcontract"
            description={`${vehicle.brand} ${vehicle.model} · ${vehicle.license_number ?? "-"}`}
          />
          <div className="flex items-center gap-2">
            <Badge variant="outline">{branchLabel(vehicle.branch)}</Badge>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ==== FORM ==== */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voertuig</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Merk / Model</div>
                  <div className="font-medium">
                    {vehicle.brand} {vehicle.model}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Bouwjaar</div>
                  <div className="font-medium">{vehicle.year ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Kenteken</div>
                  <div className="font-medium">
                    {vehicle.license_number ?? "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Kilometerstand</div>
                  <div className="font-medium">
                    {vehicle.mileage
                      ? vehicle.mileage.toLocaleString("nl-NL")
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">VIN</div>
                  <div className="font-medium">{vehicle.vin ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Kleur</div>
                  <div className="font-medium">{vehicle.color ?? "-"}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Klant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SearchableCustomerSelector
                  value={customerId}
                  onValueChange={(id, c) => {
                    setCustomerId(id);
                    setCustomer(c);
                  }}
                  customerType="customer"
                  label="Selecteer klant"
                />
                <div>
                  <Label>Contracttype</Label>
                  <RadioGroup
                    value={contractType}
                    onValueChange={(v) => setContractType(v as "b2b" | "b2c")}
                    className="flex gap-4 mt-2"
                  >
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="b2c" /> Particulier (B2C)
                    </label>
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="b2b" /> Zakelijk (B2B)
                    </label>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prijs & BTW</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="salePriceEx">Kale verkoopprijs (€)</Label>
                  <Input
                    id="salePriceEx"
                    type="number"
                    value={salePriceEx}
                    onChange={(e) => setSalePriceEx(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Regeling</Label>
                  <RadioGroup
                    value={btwType}
                    onValueChange={(v) => setBtwType(v as "marge" | "btw")}
                    className="flex gap-4 mt-2"
                  >
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="marge" /> Marge
                    </label>
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="btw" /> BTW
                    </label>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Garantiepakket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasExistingWarranty ? (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    <div className="font-medium">
                      Pakket al geregistreerd: {existingWarrantyName} — €
                      {existingWarrantyPrice.toLocaleString("nl-NL")}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Eén pakket per voertuig. Corrigeren kan uitsluitend via
                      het voertuig-detail.
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Pakket</Label>
                      <Select
                        value={warrantyCode}
                        onValueChange={(v) => {
                          setWarrantyCode(v);
                          const opt = WARRANTY_PACKAGE_OPTIONS.find(
                            (p) => p.code === v,
                          );
                          if (opt) setWarrantyPrice(String(opt.defaultPrice));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Geen pakket" />
                        </SelectTrigger>
                        <SelectContent>
                          {WARRANTY_PACKAGE_OPTIONS.map((p) => (
                            <SelectItem key={p.code} value={p.code}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {warrantyCode && (
                      <div>
                        <Label>Pakketprijs (€)</Label>
                        <Input
                          type="number"
                          value={warrantyPrice}
                          onChange={(e) => setWarrantyPrice(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Bij opslaan wordt dit pakket direct op het voertuig
                          geregistreerd — daarna niet meer wijzigbaar via een
                          contract.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inruilvoertuig</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tradeInEnabled}
                    onChange={(e) => setTradeInEnabled(e.target.checked)}
                  />
                  Inruilvoertuig toevoegen
                </label>
                {tradeInEnabled && (
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label>Omschrijving</Label>
                      <Input
                        value={tradeInDesc}
                        onChange={(e) => setTradeInDesc(e.target.value)}
                        placeholder="Merk / model / bouwjaar"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Kenteken</Label>
                        <Input
                          value={tradeInLicense}
                          onChange={(e) => setTradeInLicense(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Inruilwaarde (€)</Label>
                        <Input
                          type="number"
                          value={tradeInValue}
                          onChange={(e) => setTradeInValue(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Speciale afspraken</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={specialTerms}
                  onChange={(e) => setSpecialTerms(e.target.value)}
                  rows={4}
                  placeholder="Bijv. afspraken over aflevering, extra opties, etc."
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Annuleren
              </Button>
              <Button disabled={!canSave} onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Opslaan…" : "Concept opslaan"}
              </Button>
            </div>
          </div>

          {/* ==== PREVIEW ==== */}
          <div className="lg:sticky lg:top-4 h-fit">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border bg-white text-black p-6 space-y-4 text-sm shadow-sm min-h-[600px]">
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <div className="font-semibold text-base">
                        {vehicle.branch === "heerhugowaard"
                          ? "Autocity Noord Holland B.V."
                          : "Autocity Automotive Group B.V."}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Vestiging {branchLabel(vehicle.branch)}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-medium">Koopovereenkomst</div>
                      <div>Concept</div>
                    </div>
                  </div>

                  <section>
                    <div className="font-medium mb-1">Verkoper</div>
                    <div className="text-xs">
                      Autocity —{" "}
                      {vehicle.branch === "heerhugowaard"
                        ? "Heerhugowaard"
                        : "Rotterdam"}
                    </div>
                  </section>

                  <section>
                    <div className="font-medium mb-1">Koper</div>
                    <div className="text-xs">
                      {customer
                        ? `${customer.companyName ? customer.companyName + " — " : ""}${customer.firstName} ${customer.lastName}`
                        : "— geen klant geselecteerd —"}
                    </div>
                    {customer && (
                      <div className="text-xs text-muted-foreground">
                        {customer.email} · {customer.phone}
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="font-medium mb-1">Voertuig</div>
                    <div className="text-xs">
                      {vehicle.brand} {vehicle.model} ({vehicle.year ?? "-"})
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Kenteken {vehicle.license_number ?? "-"} · VIN{" "}
                      {vehicle.vin ?? "-"} ·{" "}
                      {vehicle.mileage
                        ? vehicle.mileage.toLocaleString("nl-NL") + " km"
                        : "-"}
                    </div>
                  </section>

                  <Separator />

                  <section className="space-y-1">
                    <div className="flex justify-between">
                      <span>Kale verkoopprijs ({btwType})</span>
                      <span>{fmtEur(parseFloat(salePriceEx) || 0)}</span>
                    </div>
                    {(hasExistingWarranty || warrantyCode) && (
                      <div className="flex justify-between">
                        <span>
                          Garantiepakket:{" "}
                          {hasExistingWarranty
                            ? existingWarrantyName
                            : WARRANTY_PACKAGE_OPTIONS.find(
                                (p) => p.code === warrantyCode,
                              )?.name}
                        </span>
                        <span>
                          {fmtEur(
                            hasExistingWarranty
                              ? existingWarrantyPrice
                              : parseFloat(warrantyPrice) || 0,
                          )}
                        </span>
                      </div>
                    )}
                    {tradeInEnabled && (
                      <div className="flex justify-between">
                        <span>
                          Inruil: {tradeInDesc || "-"}{" "}
                          {tradeInLicense ? `(${tradeInLicense})` : ""}
                        </span>
                        <span>-{fmtEur(parseFloat(tradeInValue) || 0)}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold text-base">
                      <span>Totaal</span>
                      <span>{fmtEur(total)}</span>
                    </div>
                  </section>

                  {specialTerms && (
                    <>
                      <Separator />
                      <section>
                        <div className="font-medium mb-1">Speciale afspraken</div>
                        <div className="text-xs whitespace-pre-wrap">
                          {specialTerms}
                        </div>
                      </section>
                    </>
                  )}

                  <div className="text-[10px] text-muted-foreground pt-4 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Definitieve LMS-stijl template volgt in fase 3.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}