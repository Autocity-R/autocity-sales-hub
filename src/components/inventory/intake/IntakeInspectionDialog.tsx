import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Video, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractFramesFromVideo } from "@/utils/videoFrameExtractor";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicleId: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleLicense?: string;
  defaultYear?: number;
  defaultMileage?: number;
}

type Phase = "idle" | "extracting" | "uploading" | "starting" | "done" | "error";

export const IntakeInspectionDialog: React.FC<Props> = ({
  open, onOpenChange, vehicleId, vehicleBrand, vehicleModel, vehicleLicense, defaultYear, defaultMileage,
}) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [year, setYear] = useState<number | "">(defaultYear ?? "");
  const [mileage, setMileage] = useState<number | "">(defaultMileage ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null); setPhase("idle"); setProgress(0); setStatusText(""); setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleStart = async () => {
    if (!file) { toast({ title: "Geen video", description: "Kies eerst een video", variant: "destructive" }); return; }
    if (!year || !mileage) { toast({ title: "Velden ontbreken", description: "Vul bouwjaar en km-stand in", variant: "destructive" }); return; }

    setError(null);
    try {
      // 1. Maak inspection row
      setPhase("starting"); setStatusText("Inspectie aanmaken...");
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id ?? null;
      let createdByName: string | null = null;
      if (userId) {
        const { data: prof } = await supabase.from("profiles").select("first_name,last_name").eq("id", userId).maybeSingle();
        if (prof) createdByName = `${prof.first_name ?? ""} ${prof.last_name ?? ""}`.trim();
      }

      const { data: insp, error: insErr } = await supabase
        .from("intake_inspections")
        .insert({
          vehicle_id: vehicleId,
          created_by_user_id: userId,
          created_by_name: createdByName,
          vehicle_year: Number(year),
          vehicle_mileage: Number(mileage),
          vehicle_brand: vehicleBrand,
          vehicle_model: vehicleModel,
          vehicle_license: vehicleLicense,
          status: "extracting",
        })
        .select("id")
        .single();
      if (insErr || !insp) throw new Error(insErr?.message || "Kon inspectie niet aanmaken");
      const inspectionId = insp.id;

      // 2. Extract frames client-side
      setPhase("extracting"); setStatusText("Frames extracten uit video...");
      const { frames, duration } = await extractFramesFromVideo(file, {
        maxFrames: 60,
        targetFps: 2,
        maxWidth: 1280,
        jpegQuality: 0.82,
        onProgress: (c, t) => setProgress(Math.round((c / t) * 40)), // 0-40%
      });

      // 3. Upload frames
      setPhase("uploading"); setStatusText(`Uploaden van ${frames.length} frames...`);
      for (let i = 0; i < frames.length; i++) {
        const f = frames[i];
        const path = `${inspectionId}/${f.filename}`;
        const { error: upErr } = await supabase.storage.from("intake-frames").upload(path, f.blob, {
          contentType: "image/jpeg", upsert: true,
        });
        if (upErr) throw new Error(`Upload frame ${f.filename}: ${upErr.message}`);
        setProgress(40 + Math.round(((i + 1) / frames.length) * 40)); // 40-80%
      }

      // 4. Update inspection met frames_extracted + status
      await supabase.from("intake_inspections").update({
        frames_extracted: frames.length,
        video_duration_seconds: Math.round(duration),
        status: "analyzing",
      }).eq("id", inspectionId);

      // 5. Invoke edge function (fire-and-forget — realtime updates UI)
      setStatusText("Robin analyseert de video...");
      setProgress(85);
      supabase.functions.invoke("intake-robin-analyse", { body: { inspection_id: inspectionId } })
        .then(({ error: fnErr }) => {
          if (fnErr) console.error("[robin] invoke error", fnErr);
        });

      setPhase("done");
      setProgress(100);
      toast({ title: "Analyse gestart", description: "Robin verwerkt de video. Het rapport verschijnt zo bij Documenten." });
      setTimeout(() => { onOpenChange(false); reset(); }, 1500);
    } catch (e: any) {
      console.error("[intake] error", e);
      setError(e.message || "Onbekende fout");
      setPhase("error");
    }
  };

  const busy = phase === "extracting" || phase === "uploading" || phase === "starting";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" /> Robin — Inname inspectie
          </DialogTitle>
          <DialogDescription>
            Robin analyseert je video en maakt automatisch een schaderapport.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p className="font-medium mb-1">Filmrichtlijnen</p>
            <p className="text-muted-foreground">
              Loop langzaam rondom de auto (30-90 sec). Begin voorzijde, ga naar rechts, achter, links.
              Maak korte stops bij elk paneel. Film ook close-up van velgen en dashboard met km-stand zichtbaar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="year">Bouwjaar</Label>
              <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")} disabled={busy} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="km">Km-stand</Label>
              <Input id="km" type="number" value={mileage} onChange={(e) => setMileage(e.target.value ? Number(e.target.value) : "")} disabled={busy} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="video">Video (camera of upload)</Label>
            <Input
              ref={fileRef}
              id="video"
              type="file"
              accept="video/*"
              capture="environment"
              disabled={busy}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} — {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>

          {(busy || phase === "done") && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                {busy && <Loader2 className="h-3 w-3 animate-spin" />}
                {statusText}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { onOpenChange(false); reset(); }} disabled={busy}>
            Annuleren
          </Button>
          <Button onClick={handleStart} disabled={busy || !file}>
            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Bezig...</> : "Start inspectie"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};