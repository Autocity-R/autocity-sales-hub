import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/common/SignaturePad";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PenLine, Save, Trash2 } from "lucide-react";

export function SignatureSettings() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("signature_png")
          .eq("id", uid)
          .maybeSingle();
        const sig = (prof as any)?.signature_png ?? null;
        setCurrent(sig);
        setDraft(sig);
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ signature_png: draft })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast({ title: "Opslaan mislukt", description: error.message, variant: "destructive" });
      return;
    }
    setCurrent(draft);
    toast({ title: "Handtekening opgeslagen" });
  }

  async function remove() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ signature_png: null })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast({ title: "Verwijderen mislukt", description: error.message, variant: "destructive" });
      return;
    }
    setCurrent(null);
    setDraft(null);
    toast({ title: "Handtekening verwijderd" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="h-5 w-5" /> Handtekening
        </CardTitle>
        <CardDescription>
          Zet hieronder je persoonlijke handtekening. Deze wordt automatisch op
          alle door jou opgestelde koopcontracten geplaatst.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : (
          <>
            {current && (
              <div className="rounded-md border p-3 bg-muted/40">
                <div className="text-xs text-muted-foreground mb-2">Huidige handtekening</div>
                <img src={current} alt="handtekening" style={{ maxHeight: 100 }} />
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground mb-2">
                Teken hieronder (muis of touch). Wissen wist het canvas.
              </div>
              <SignaturePad value={current ?? undefined} onChange={setDraft} />
            </div>
            <div className="flex gap-2 justify-end">
              {current && (
                <Button variant="outline" onClick={remove} disabled={saving}>
                  <Trash2 className="h-4 w-4 mr-2" /> Verwijderen
                </Button>
              )}
              <Button onClick={save} disabled={saving || !draft}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Opslaan…" : "Opslaan"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default SignatureSettings;