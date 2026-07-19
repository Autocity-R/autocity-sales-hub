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
import {
  ArrowLeft, ShieldCheck, Save, Send, Copy, Check, Plus, Trash2, Eye, EyeOff,
} from "lucide-react";
import {
  WARRANTY_PACKAGE_OPTIONS,
  createContractV2,
  sendContractV2,
} from "@/services/contractV2Service";
import {
  ContractDocumentV2,
  ContractV2Snapshot,
} from "@/components/contracts/ContractDocumentV2";
import { buildSalespersonSignatureSvg } from "@/utils/salespersonSignature";

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
  const [tradeInBrand, setTradeInBrand] = useState("");
  const [tradeInModel, setTradeInModel] = useState("");
  const [tradeInYear, setTradeInYear] = useState<string>("");
  const [tradeInLicense, setTradeInLicense] = useState("");
  const [tradeInMileage, setTradeInMileage] = useState<string>("");
  const [tradeInValue, setTradeInValue] = useState<string>("0");
  const [accessories, setAccessories] = useState<Array<{ name: string; price: string }>>([]);
  const [financingConditional, setFinancingConditional] = useState(false);
  const [financingParty, setFinancingParty] = useState("");
  const [specialTerms, setSpecialTerms] = useState("");
  const [contractType, setContractType] = useState<"b2b" | "b2c">("b2c");
  const [deliveryDate, setDeliveryDate] = useState<string>("");

  // Salesperson (ingelogde verkoper is contractant)
  const [salespersonName, setSalespersonName] = useState<string | null>(null);
  const [salespersonEmail, setSalespersonEmail] = useState<string | null>(null);

  // Extras
  const [mainPhotoUrl, setMainPhotoUrl] = useState<string | null>(null);
  const [branchInfo, setBranchInfo] = useState<any | null>(null);
  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");

  // Saved-contract state (after "Concept opslaan")
  const [savedContract, setSavedContract] = useState<any | null>(null);
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

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

      // Salesperson (ingelogde gebruiker)
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", uid)
          .maybeSingle();
        if (prof) {
          const name = [prof.first_name, prof.last_name].filter(Boolean).join(" ");
          setSalespersonName(name || null);
          setSalespersonEmail(prof.email || authData.user?.email || null);
        }
      }

      // Branch entiteitgegevens (voor company_snapshot in preview)
      const { data: br } = await supabase
        .from("branches")
        .select("*")
        .eq("code", (data as any).branch)
        .maybeSingle();
      if (br) setBranchInfo(br);

      // Hoofdfoto voor hero
      let photo: string | null = (data.details as any)?.mainPhotoUrl || null;
      if (!photo) {
        const { data: pf } = await supabase
          .from("vehicle_files")
          .select("file_url, file_path")
          .eq("vehicle_id", data.id)
          .in("category", ["photo", "main_photo"])
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        photo = (pf as any)?.file_url || null;
      }
      if (!photo) {
        const { data: sh } = await supabase
          .from("vehicle_showroom_photos")
          .select("photo_url")
          .eq("vehicle_id", data.id)
          .order("photo_index", { ascending: true })
          .limit(1)
          .maybeSingle();
        photo = (sh as any)?.photo_url || null;
      }
      setMainPhotoUrl(photo);
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
      deliveryDate: deliveryDate || undefined,
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
    setSavedContract(res.contract);
    toast({
      title: "Concept opgeslagen",
      description: `Contract ${res.contract?.contract_number} aangemaakt.`,
    });
  }

  async function handleSend() {
    if (!savedContract) return;
    setSending(true);
    const res = await sendContractV2(savedContract.id);
    setSending(false);
    if (res.error) {
      toast({
        title: "Versturen mislukt",
        description: res.detail || res.error,
        variant: "destructive",
      });
      return;
    }
    setSignUrl(res.sign_url ?? null);
    toast({
      title: "Ondertekenlink verstuurd",
      description: "De klant heeft een e-mail met een 48 uur geldige link ontvangen.",
    });
  }

  // Build preview snapshot (uses form state; snapshots-shape mirrors what the
  // edge function stores so the LMS-style document renders 1-op-1).
  const previewData: ContractV2Snapshot | null = vehicle
    ? {
        contract_number:
          savedContract?.contract_number ||
          `AC-${vehicle.branch === "heerhugowaard" ? "HHW" : "RTD"}-${new Date().getFullYear()}-####`,
        contract_type: contractType,
        status: (savedContract?.status as any) || "concept",
        branch: vehicle.branch,
        created_at: savedContract?.created_at || new Date().toISOString(),
        delivery_date: deliveryDate || null,
        vehicle_snapshot: {
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          licenseNumber: vehicle.license_number,
          vin: vehicle.vin,
          mileage: vehicle.mileage,
          color: vehicle.color,
          fuel: (vehicle.details as any)?.fuel || (vehicle.details as any)?.brandstof || null,
          transmission:
            (vehicle.details as any)?.transmission ||
            (vehicle.details as any)?.transmissie ||
            null,
        },
        customer_snapshot: customer
          ? {
              companyName: customer.companyName,
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              phone: customer.phone,
              street: (customer as any).addressStreet,
              number: (customer as any).addressNumber,
              city: (customer as any).addressCity,
              zipCode: (customer as any).addressPostalCode,
            }
          : {},
        company_snapshot: {
          companyName:
            vehicle.branch === "heerhugowaard"
              ? "Autocity Noord Holland B.V."
              : "Autocity Automotive Group B.V.",
          city: branchLabel(vehicle.branch),
        },
        sale_price_ex: parseFloat(salePriceEx) || 0,
        btw_type: btwType,
        warranty_package: hasExistingWarranty
          ? (vehicle.details as any)?.warrantyPackage
          : warrantyCode || null,
        warranty_package_name: hasExistingWarranty
          ? existingWarrantyName
          : WARRANTY_PACKAGE_OPTIONS.find((p) => p.code === warrantyCode)?.name || null,
        warranty_price: hasExistingWarranty
          ? existingWarrantyPrice
          : parseFloat(warrantyPrice) || 0,
        trade_in_vehicle: tradeInEnabled
          ? { description: tradeInDesc, licenseNumber: tradeInLicense }
          : null,
        trade_in_value: tradeInEnabled ? parseFloat(tradeInValue) || 0 : 0,
        special_terms: specialTerms || null,
        total_price: total,
        main_photo_url: (vehicle.details as any)?.mainPhotoUrl || null,
        salesperson_name: savedContract?.salesperson_name || null,
        salesperson_email: savedContract?.salesperson_email || null,
        salesperson_signature_svg:
          savedContract?.salesperson_signature_svg || null,
      }
    : null;

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
                <div className="mb-4">
                  <Label htmlFor="deliveryDate">Afleverdatum (optioneel)</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
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
              <Button disabled={!canSave || !!savedContract} onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Opslaan…" : savedContract ? "Opgeslagen" : "Concept opslaan"}
              </Button>
              {savedContract && !signUrl && (
                <Button onClick={handleSend} disabled={sending}>
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? "Versturen…" : "Verstuur ter ondertekening"}
                </Button>
              )}
            </div>

            {signUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Ondertekenlink</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    De klant heeft een e-mail ontvangen. De link is 48 uur geldig.
                  </p>
                  <div className="flex gap-2">
                    <Input value={signUrl} readOnly />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(signUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ==== PREVIEW ==== */}
          <div className="lg:sticky lg:top-4 h-fit">
            <Card>
              <CardHeader>
                <CardTitle>Live preview (LMS-stijl)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  style={{
                    maxHeight: "80vh",
                    overflow: "auto",
                    background: "#0b0b0b",
                    transform: "scale(0.55)",
                    transformOrigin: "top left",
                    width: "182%",
                    height: 900,
                  }}
                >
                  {previewData && <ContractDocumentV2 data={previewData} />}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}