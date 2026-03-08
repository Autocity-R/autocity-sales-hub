import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Upload, Loader2, CheckCircle2, AlertCircle, 
  Camera, Sparkles, Download, RefreshCw 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface CarPhotoUploaderProps {
  vehicleId: string;
  licensePlate?: string;
  onPhotoGenerated?: (url: string) => void;
}

type Status = "idle" | "uploading" | "studio" | "board" | "done" | "error";

export function CarPhotoUploader({ vehicleId, onPhotoGenerated }: CarPhotoUploaderProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [studioImageUrl, setStudioImageUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/...;base64, prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processPhoto = async (file: File) => {
    setStatus("uploading");
    setProgress(5);
    setErrorMessage(null);

    try {
      const imageBase64 = await fileToBase64(file);
      setProgress(10);

      // Stap 1: Studio transformatie
      setStatus("studio");
      setProgress(15);

      const studioResponse = await supabase.functions.invoke("showroom-photo-studio", {
        body: { imageBase64, step: "studio" },
      });

      if (studioResponse.error || !studioResponse.data?.success) {
        throw new Error(studioResponse.data?.error || studioResponse.error?.message || "Studio transformatie mislukt");
      }

      const studioUrl = studioResponse.data.studioUrl;
      setStudioImageUrl(studioUrl);
      setProgress(50);

      // Haal studio image op als base64
      setStatus("board");
      const studioImageResponse = await fetch(studioUrl);
      const studioBlob = await studioImageResponse.blob();
      const studioBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(studioBlob);
      });
      setProgress(60);

      // Stap 2: AutoCity bord plaatsing
      const boardResponse = await supabase.functions.invoke("showroom-photo-studio", {
        body: { imageBase64: studioBase64, step: "board" },
      });

      if (boardResponse.error || !boardResponse.data?.success) {
        throw new Error(boardResponse.data?.error || boardResponse.error?.message || "Bord plaatsing mislukt");
      }

      const finalUrl = boardResponse.data.finalUrl;
      setProgress(90);

      // Update vehicle record
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({ 
          showroom_photo_url: finalUrl,
          showroom_photo_generated_at: new Date().toISOString()
        })
        .eq("id", vehicleId);

      if (updateError) {
        console.error("Failed to update vehicle:", updateError);
      }

      setFinalImageUrl(finalUrl);
      setProgress(100);
      setStatus("done");
      toast.success("Showroom foto succesvol gegenereerd!");
      onPhotoGenerated?.(finalUrl);

    } catch (error: any) {
      console.error("Transformatie mislukt:", error);
      setErrorMessage(error.message || "Onbekende fout");
      setStatus("error");
      toast.error(`Fout: ${error.message}`);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      processPhoto(file);
    }
  }, [vehicleId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'image/jpeg': ['.jpg', '.jpeg'], 
      'image/png': ['.png'], 
      'image/webp': ['.webp'] 
    },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
    disabled: status !== "idle" && status !== "done" && status !== "error",
  });

  const reset = () => {
    setStatus("idle");
    setFinalImageUrl(null);
    setStudioImageUrl(null);
    setErrorMessage(null);
    setProgress(0);
  };

  const downloadImage = () => {
    if (!finalImageUrl) return;
    const link = document.createElement("a");
    link.href = finalImageUrl;
    link.download = `showroom_${vehicleId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isProcessing = status === "uploading" || status === "studio" || status === "board";

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      {(status === "idle" || status === "error") && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
            "hover:border-primary/50 hover:bg-muted/30",
            isDragActive && "border-primary bg-primary/5",
            "border-muted-foreground/25"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-muted p-4">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-medium">
                {isDragActive ? "Laat foto hier los..." : "Sleep foto hierheen of klik om te uploaden"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                JPG, PNG of WebP — max 20MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Processing status */}
      {isProcessing && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">
                {status === "uploading" && "Foto wordt voorbereid..."}
                {status === "studio" && "Stap 1/2: Studio achtergrond wordt gegenereerd..."}
                {status === "board" && "Stap 2/2: AutoCity bord wordt geplaatst..."}
              </p>
              <p className="text-sm text-muted-foreground">
                Dit kan 30-90 seconden duren
              </p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("px-2 py-1 rounded", status === "studio" ? "bg-primary/20 text-primary font-semibold" : "opacity-50")}>
              1. Studio
            </span>
            <span>→</span>
            <span className={cn("px-2 py-1 rounded", status === "board" ? "bg-primary/20 text-primary font-semibold" : "opacity-50")}>
              2. AutoCity Bord
            </span>
          </div>

          {/* Preview tussentijds resultaat */}
          {studioImageUrl && status === "board" && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Tussentijds resultaat (studio):</p>
              <img 
                src={studioImageUrl} 
                alt="Studio preview" 
                className="w-full max-w-md rounded-lg border"
              />
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="border border-destructive/50 bg-destructive/10 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Er is een fout opgetreden</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Opnieuw proberen
          </Button>
        </div>
      )}

      {/* Success state */}
      {status === "done" && finalImageUrl && (
        <div className="border border-green-500/50 bg-green-50 dark:bg-green-950/20 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Showroom foto klaar!</p>
              <p className="text-sm text-muted-foreground">De foto is opgeslagen bij dit voertuig</p>
            </div>
          </div>
          
          <img 
            src={finalImageUrl} 
            alt="Showroom foto" 
            className="w-full rounded-lg border"
          />
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadImage}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={reset}>
              <Sparkles className="h-4 w-4 mr-2" />
              Nieuwe foto genereren
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
