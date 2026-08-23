import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Wrench } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_TARIEVEN, WerkplaatsTarieven as Tarieven, fetchTarieven, saveTarieven, eur, inclBtw,
} from "@/services/werkplaatsPrijsService";

export const WerkplaatsTarieven: React.FC = () => {
  const { userRole, isAdmin } = useAuth();
  const mayEdit = isAdmin || userRole === "aftersales_manager";
  const [t, setT] = useState<Tarieven>(DEFAULT_TARIEVEN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTarieven().then((v) => { setT(v); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveTarieven(t);
      setT(await fetchTarieven());
      toast({ title: "Tarieven opgeslagen" });
    } catch (e: any) {
      toast({ title: "Opslaan mislukt", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Wrench className="h-5 w-5" /> Werkplaats-tarieven
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Basis voor de prijschecker en handmatige facturen. Arbeid = uren × uurtarief × merkfactor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schadeherstel</CardTitle>
          <CardDescription>
            Heeft deze onderneming een eigen schadeherstel-afdeling? Zo niet, dan wordt schadeherstel altijd uitbesteed aan een externe spuiter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="eigen-schade">Eigen schadeherstel-afdeling: ja/nee</Label>
            <Switch
              id="eigen-schade" checked={t.eigen_schadeherstel} disabled={!mayEdit}
              onCheckedChange={(v) => setT({ ...t, eigen_schadeherstel: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>

        <CardHeader>
          <CardTitle className="text-base">Uurtarief</CardTitle>
          <CardDescription>Marktconform tarief voor onafhankelijke garages, exclusief btw.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="uurtarief">Uurtarief werkplaats (excl. btw)</Label>
            <Input
              id="uurtarief" type="number" step="0.01" min="0" disabled={!mayEdit}
              value={t.uurtarief_ex_btw}
              onChange={(e) => setT({ ...t, uurtarief_ex_btw: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Incl. 21% btw: <strong>{eur(inclBtw(t.uurtarief_ex_btw))}</strong> per uur
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Toeslag klein materiaal</CardTitle>
          <CardDescription>Percentage van de arbeid voor verbruiksmateriaal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="km-on">Toeslag toepassen</Label>
            <Switch
              id="km-on" checked={t.klein_materiaal_enabled} disabled={!mayEdit}
              onCheckedChange={(v) => setT({ ...t, klein_materiaal_enabled: v })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="km-pct">Percentage van arbeid (%)</Label>
            <Input
              id="km-pct" type="number" step="0.1" min="0" max="100"
              disabled={!mayEdit || !t.klein_materiaal_enabled}
              value={t.klein_materiaal_pct}
              onChange={(e) => setT({ ...t, klein_materiaal_pct: Number(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Marge op onderdelen</CardTitle>
          <CardDescription>Standaard verkoopmarge op de inkoopprijs bij het doorbelasten van onderdelen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="marge-pct">Standaard marge op onderdelen (%)</Label>
            <Input
              id="marge-pct" type="number" step="1" min="0" max="500" disabled={!mayEdit}
              value={t.onderdelen_marge_pct}
              onChange={(e) => setT({ ...t, onderdelen_marge_pct: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Voorbeeld: inkoop {eur(100)} → verkoopprijs {eur(100 * (1 + (Number(t.onderdelen_marge_pct) || 0) / 100))} (ex btw)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Milieu-/afvoerkosten</CardTitle>
          <CardDescription>Vast bedrag per factuur, exclusief btw.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="mk-on">Milieukosten toepassen</Label>
            <Switch
              id="mk-on" checked={t.milieukosten_enabled} disabled={!mayEdit}
              onCheckedChange={(v) => setT({ ...t, milieukosten_enabled: v })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mk-bedrag">Bedrag (excl. btw)</Label>
            <Input
              id="mk-bedrag" type="number" step="0.01" min="0"
              disabled={!mayEdit || !t.milieukosten_enabled}
              value={t.milieukosten_bedrag}
              onChange={(e) => setT({ ...t, milieukosten_bedrag: Number(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      {mayEdit ? (
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Opslaan
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">Je hebt geen rechten om deze tarieven te wijzigen.</p>
      )}
    </div>
  );
};

export default WerkplaatsTarieven;
