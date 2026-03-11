import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, Download, RefreshCw, X, ImageIcon, 
  Sparkles, Loader2, CheckCircle2, AlertCircle,
  Images, Camera
} from "lucide-react";
import { cn } from "@/lib/utils";
import OptimizedDashboardLayout from "@/components/layout/OptimizedDashboardLayout";
import { Progress } from "@/components/ui/progress";

const SHOT_ANGLE_OPTIONS = [
  { value: "front-left", label: "3/4 voor links" },
  { value: "side-left", label: "Linker zijkant" },
  { value: "rear-left", label: "3/4 achter links" },
  { value: "rear", label: "Achterzijde" },
  { value: "rear-right", label: "3/4 achter rechts" },
  { value: "side-right", label: "Rechter zijkant" },
  { value: "front-right", label: "3/4 voor rechts" },
  { value: "front", label: "Voorzijde" },
] as const;

interface StudioImage {
  id: string;
  originalFile: File;
  originalPreview: string;
  resultImage: string | null;
  resultUrl: string | null;
  status: 'queued' | 'processing' | 'done' | 'error';
  error?: string;
  shotAngle?: string;
}

const STANDARD_ANGLES = ['front-left', 'side-left', 'rear-left', 'rear', 'rear-right', 'side-right', 'front-right', 'front'];

const FotoStudio = () => {
  const [images, setImages] = useState<StudioImage[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [licensePlate, setLicensePlate] = useState("");
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const autoAssign = acceptedFiles.length === 8;
    const newImages: StudioImage[] = acceptedFiles.map((file, index) => ({
      id: crypto.randomUUID(),
      originalFile: file,
      originalPreview: URL.createObjectURL(file),
      resultImage: null,
      resultUrl: null,
      status: 'queued' as const,
      ...(autoAssign ? { shotAngle: STANDARD_ANGLES[index] } : {}),
    }));
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    maxSize: 20 * 1024 * 1024,
    multiple: true,
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processImage = async (imageId: string, photoNumber: number, referenceImageBase64: string | null) => {
    const image = images.find(i => i.id === imageId);
    if (!image) return null;

    setImages(prev => prev.map(i => i.id === imageId ? { ...i, status: 'processing' } : i));

    try {
      const base64 = await fileToBase64(image.originalFile);

      const { data, error } = await supabase.functions.invoke('showroom-photo-studio', {
        body: { 
          imageBase64: base64,
          photoNumber,
          shotAngle: image.shotAngle || 'front-right',
          ...(referenceImageBase64 ? { referenceImageBase64 } : {}),
        }
      });

      if (error) throw new Error(error.message || 'Verwerking mislukt');
      if (!data?.success) throw new Error(data?.error || 'Verwerking mislukt');

      const resultImage = data.resultImage;
      const resultUrl = data.publicUrl;
      
      setImages(prev => prev.map(i => 
        i.id === imageId ? { 
          ...i, 
          status: 'done', 
          resultImage,
          resultUrl,
        } : i
      ));

      return resultImage;
    } catch (err: any) {
      console.error('Studio processing error:', err);
      const errorMsg = err?.message || 'Onbekende fout';
      setImages(prev => prev.map(i => 
        i.id === imageId ? { ...i, status: 'error', error: errorMsg } : i
      ));
      toast.error(`Fout bij foto ${photoNumber}: ${errorMsg}`);
      return null;
    }
  };

  const processAll = async () => {
    const toProcess = images.filter(i => i.status === 'queued' || i.status === 'error');
    if (toProcess.length === 0) return;
    setIsProcessingAll(true);

    let previousResultBase64: string | null = null;

    // Find the last successfully processed image before the first queued one as initial reference
    const firstQueuedIdx = images.findIndex(i => i.status === 'queued' || i.status === 'error');
    if (firstQueuedIdx > 0) {
      const prevDone = images.slice(0, firstQueuedIdx).reverse().find(i => i.status === 'done' && i.resultImage);
      if (prevDone) previousResultBase64 = prevDone.resultImage;
    }

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.status !== 'queued' && img.status !== 'error') {
        // If this image is already done, use it as reference for the next
        if (img.status === 'done' && img.resultImage) {
          previousResultBase64 = img.resultImage;
        }
        continue;
      }

      setCurrentProcessingIndex(i);
      const photoNumber = i + 1;
      const result = await processImage(img.id, photoNumber, previousResultBase64);
      
      if (result) {
        previousResultBase64 = result;
      }
      // If this photo failed, we still pass the previous successful result to the next
    }

    setCurrentProcessingIndex(null);
    setIsProcessingAll(false);
    toast.success('Alle foto\'s verwerkt!');
  };

  const regenerateImage = async (imageId: string) => {
    const idx = images.findIndex(i => i.id === imageId);
    if (idx === -1) return;

    // Find previous done image as reference
    let referenceBase64: string | null = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (images[i].status === 'done' && images[i].resultImage) {
        referenceBase64 = images[i].resultImage;
        break;
      }
    }

    const photoNumber = idx + 1;
    await processImage(imageId, photoNumber, referenceBase64);
  };

  const downloadImage = (resultImage: string, index: number) => {
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `autocity_studio_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    const completed = images.filter(i => i.status === 'done' && i.resultImage);
    completed.forEach((img, i) => {
      setTimeout(() => downloadImage(img.resultImage!, i), i * 300);
    });
  };

  const removeImage = (imageId: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === imageId);
      if (img) URL.revokeObjectURL(img.originalPreview);
      return prev.filter(i => i.id !== imageId);
    });
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.originalPreview));
    setImages([]);
  };

  const completedCount = images.filter(i => i.status === 'done').length;
  const processingCount = images.filter(i => i.status === 'processing').length;
  const progress = images.length > 0 ? ((completedCount / images.length) * 100) : 0;

  return (
    <OptimizedDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Camera className="h-6 w-6 text-primary" />
              Foto Studio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload voertuigfoto's en laat AI ze omzetten naar professionele AutoCity showroom-beelden. 
              Foto's worden sequentieel verwerkt voor maximale consistentie.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {images.length > 0 && (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={clearAll} disabled={isProcessingAll}>
              <X className="h-4 w-4 mr-1" />
              Wissen
            </Button>
            {completedCount > 0 && (
              <Button variant="outline" size="sm" onClick={downloadAll}>
                <Download className="h-4 w-4 mr-1" />
                Alles downloaden ({completedCount})
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={processAll}
              disabled={isProcessingAll || images.filter(i => i.status === 'queued' || i.status === 'error').length === 0}
            >
              {isProcessingAll ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              {isProcessingAll ? `Verwerken (${completedCount + 1}/${images.length})...` : 'Alles verwerken'}
            </Button>
          </div>
        )}

        {/* Progress bar */}
        {images.length > 0 && (processingCount > 0 || completedCount > 0) && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedCount} van {images.length} foto's klaar</span>
              {processingCount > 0 && currentProcessingIndex !== null && (
                <span>Foto {currentProcessingIndex + 1} wordt verwerkt (sequentieel)...</span>
              )}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Settings */}
        <div className="max-w-sm space-y-1.5">
          <Label htmlFor="licensePlate">Kenteken (optioneel)</Label>
          <Input
            id="licensePlate"
            placeholder="bijv. HGD-08-K"
            value={licensePlate}
            onChange={e => setLicensePlate(e.target.value)}
          />
        </div>

        {/* Upload zone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all",
            "hover:border-primary/50 hover:bg-muted/30",
            isDragActive && "border-primary bg-primary/5",
            "border-muted-foreground/25"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-muted p-5">
              <Images className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? "Laat foto's hier los..." : "Sleep voertuigfoto's hierheen of klik om te uploaden"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                JPG, PNG of WebP — max 20MB per foto — upload 8 foto's voor automatische hoektoewijzing
              </p>
            </div>
          </div>
        </div>

        {/* Results grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {images.map((img, index) => (
              <div key={img.id} className="border rounded-lg overflow-hidden bg-card">
                <div className="grid grid-cols-2 gap-0">
                  {/* Original */}
                  <div className="relative bg-muted/50">
                    <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded-md font-medium">
                      Origineel
                    </div>
                    <img 
                      src={img.originalPreview} 
                      alt={`Origineel ${index + 1}`}
                      className="w-full h-72 object-contain"
                    />
                  </div>

                  {/* Result */}
                  <div className="relative bg-muted">
                    <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Studio
                    </div>
                    {img.status === 'queued' && (
                      <div className="w-full h-72 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="text-xs">Wacht op verwerking</p>
                          <p className="text-[10px] mt-1 opacity-60">Foto {index + 1} van {images.length}</p>
                        </div>
                      </div>
                    )}
                    {img.status === 'processing' && (
                      <div className="w-full h-72 flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
                          <p className="text-xs text-muted-foreground font-medium">
                            Showroom foto wordt gegenereerd...
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {index > 0 ? 'Met referentie van vorige foto' : 'Eerste foto — studio stijl wordt vastgelegd'}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">Dit kan 30-90 seconden duren</p>
                        </div>
                      </div>
                    )}
                    {img.status === 'done' && img.resultImage && (
                      <img 
                        src={img.resultImage} 
                        alt={`Studio ${index + 1}`}
                        className="w-full h-72 object-contain"
                      />
                    )}
                    {img.status === 'error' && (
                      <div className="w-full h-72 flex items-center justify-center">
                        <div className="text-center text-destructive">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-xs px-2">{img.error || 'Fout'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between p-2 border-t bg-muted/20 gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                    {img.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                    {img.status === 'processing' && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
                    <span className="truncate max-w-[100px]">{img.originalFile.name}</span>
                  </div>
                  <Select
                    value={img.shotAngle || ""}
                    onValueChange={(val) => setImages(prev => prev.map(i => i.id === img.id ? { ...i, shotAngle: val } : i))}
                    disabled={img.status === 'processing'}
                  >
                    <SelectTrigger className="h-7 text-xs w-[130px] shrink-0">
                      <SelectValue placeholder="Geen hoek" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOT_ANGLE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    {img.status === 'done' && img.resultImage && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => downloadImage(img.resultImage!, index)}>
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download
                      </Button>
                    )}
                    {(img.status === 'error' || img.status === 'done') && !isProcessingAll && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => regenerateImage(img.id)}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Opnieuw
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => removeImage(img.id)} disabled={isProcessingAll}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </OptimizedDashboardLayout>
  );
};

export default FotoStudio;
