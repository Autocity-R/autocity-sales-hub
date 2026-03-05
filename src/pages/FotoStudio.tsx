import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Upload, Download, RefreshCw, Save, ImageIcon, 
  Sparkles, Loader2, X, CheckCircle2, AlertCircle,
  Images, Camera, Car, ShieldCheck, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import OptimizedDashboardLayout from "@/components/layout/OptimizedDashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface VerificationResult {
  pass: boolean;
  severity: string;
  mirrored: boolean;
  changed_parts: string[];
  issues: string[];
}

interface StudioImage {
  id: string;
  originalFile: File;
  originalPreview: string;
  resultImage: string | null;
  status: 'queued' | 'processing' | 'done' | 'error';
  processingStep?: 'retouch' | 'showroom' | 'verificatie';
  error?: string;
  usedFallback?: boolean;
  verification?: VerificationResult;
}

interface VehicleInfo {
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
}

const STUDIO_REFERENCE_URL = '/autocity-studio-reference.jpg';

const fetchStudioReferenceBase64 = async (): Promise<string | null> => {
  try {
    const response = await fetch(STUDIO_REFERENCE_URL);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const FotoStudio = () => {
  const [images, setImages] = useState<StudioImage[]>([]);
  const [manualBrand, setManualBrand] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [manualYear, setManualYear] = useState("");
  const [manualColor, setManualColor] = useState("");
  const [studioRefBase64, setStudioRefBase64] = useState<string | null>(null);

  // Preload studio reference image on mount
  React.useEffect(() => {
    fetchStudioReferenceBase64().then(setStudioRefBase64);
  }, []);

  const getVehicleInfo = (): VehicleInfo | null => {
    if (!manualBrand.trim() || !manualModel.trim()) return null;
    return {
      brand: manualBrand.trim(),
      model: manualModel.trim(),
      year: manualYear.trim() ? parseInt(manualYear.trim(), 10) || null : null,
      color: manualColor.trim() || null,
    };
  };
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages: StudioImage[] = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      originalFile: file,
      originalPreview: URL.createObjectURL(file),
      resultImage: null,
      status: 'queued' as const,
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

  // Reference image no longer needed — AI now generates a generic showroom background
  // Kept as comment for future logo overlay feature

  const processImage = async (imageId: string) => {
    const image = images.find(i => i.id === imageId);
    if (!image) return;

    setImages(prev => prev.map(i => i.id === imageId ? { ...i, status: 'processing', processingStep: 'retouch', usedFallback: false, verification: undefined } : i));

    // Update processing steps based on timing
    const showroomTimer = setTimeout(() => {
      setImages(prev => prev.map(i => i.id === imageId && i.status === 'processing' ? { ...i, processingStep: 'showroom' } : i));
    }, 15000);

    const verifyTimer = setTimeout(() => {
      setImages(prev => prev.map(i => i.id === imageId && i.status === 'processing' ? { ...i, processingStep: 'verificatie' } : i));
    }, 45000);

    try {
      const base64 = await fileToBase64(image.originalFile);

      const { data, error } = await supabase.functions.invoke('showroom-photo-studio', {
        body: { imageBase64: base64, vehicleInfo: getVehicleInfo(), studioReferenceBase64: studioRefBase64 }
      });

      if (error) throw new Error(error.message || 'Verwerking mislukt');
      if (data?.error) throw new Error(data.error);

      clearTimeout(showroomTimer);
      clearTimeout(verifyTimer);
      
      setImages(prev => prev.map(i => 
        i.id === imageId ? { 
          ...i, 
          status: 'done', 
          resultImage: data.resultImage, 
          processingStep: undefined,
          usedFallback: data.usedFallback || false,
          verification: data.verification || undefined,
        } : i
      ));

      if (data.usedFallback) {
        toast.warning('Identity check gefaald — verbeterde originele foto gebruikt als veilig alternatief.');
      }
    } catch (err: any) {
      clearTimeout(showroomTimer);
      clearTimeout(verifyTimer);
      console.error('Studio processing error:', err);
      const errorMsg = err?.message || 'Onbekende fout';
      setImages(prev => prev.map(i => 
        i.id === imageId ? { ...i, status: 'error', error: errorMsg } : i
      ));
      toast.error(`Fout: ${errorMsg}`);
    }
  };

  const processAll = async () => {
    const queued = images.filter(i => i.status === 'queued' || i.status === 'error');
    if (queued.length === 0) return;
    setIsProcessingAll(true);
    for (let i = 0; i < queued.length; i += 2) {
      const batch = queued.slice(i, i + 2);
      await Promise.all(batch.map(img => processImage(img.id)));
    }
    setIsProcessingAll(false);
    toast.success('Alle foto\'s verwerkt!');
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Camera className="h-6 w-6 text-primary" />
                Foto Studio
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Upload voertuigfoto's en laat AI ze omzetten naar professionele AutoCity showroom-beelden
              </p>
            </div>
          </div>

          {/* Vehicle info - manual input */}
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Merk (bijv. BMW)"
              value={manualBrand}
              onChange={e => setManualBrand(e.target.value)}
              className="w-40"
              maxLength={50}
            />
            <Input
              placeholder="Model (bijv. X5)"
              value={manualModel}
              onChange={e => setManualModel(e.target.value)}
              className="w-40"
              maxLength={50}
            />
            <Input
              placeholder="Bouwjaar"
              value={manualYear}
              onChange={e => setManualYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-28"
              maxLength={4}
            />
            <Input
              placeholder="Kleur (bijv. Zwart)"
              value={manualColor}
              onChange={e => setManualColor(e.target.value)}
              className="w-36"
              maxLength={50}
            />
            {manualBrand && manualModel && (
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                <Car className="h-3.5 w-3.5 inline mr-1" />
                AI behoudt exact het {manualYear || ''} {manualBrand} {manualModel} {manualColor ? `(${manualColor})` : ''} model
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {images.length > 0 && (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={clearAll}>
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
              {isProcessingAll ? 'Verwerken...' : 'Alles verwerken'}
            </Button>
          </div>
        )}

        {/* Progress bar */}
        {images.length > 0 && (processingCount > 0 || completedCount > 0) && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedCount} van {images.length} foto's klaar</span>
              {processingCount > 0 && <span>{processingCount} worden verwerkt...</span>}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

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
                JPG, PNG of WebP — max 20MB per foto — meerdere bestanden tegelijk
              </p>
            </div>
          </div>
        </div>

        {/* Results grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {images.map((img, index) => (
              <div 
                key={img.id} 
                className="border rounded-lg overflow-hidden bg-card"
              >
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
                        </div>
                      </div>
                    )}
                    {img.status === 'processing' && (
                      <div className="w-full h-72 flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
                          <p className="text-xs text-muted-foreground font-medium">
                            {img.processingStep === 'verificatie' ? 'AI controleert resultaat...' : img.processingStep === 'showroom' ? 'AI plaatst in showroom...' : 'AI retoucheert foto...'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                            <span className={cn("px-1.5 py-0.5 rounded", img.processingStep === 'retouch' ? "bg-primary/20 text-primary font-semibold" : "opacity-50")}>1. Retouch</span>
                            <span>→</span>
                            <span className={cn("px-1.5 py-0.5 rounded", img.processingStep === 'showroom' ? "bg-primary/20 text-primary font-semibold" : "opacity-50")}>2. Showroom</span>
                            <span>→</span>
                            <span className={cn("px-1.5 py-0.5 rounded", img.processingStep === 'verificatie' ? "bg-primary/20 text-primary font-semibold" : "opacity-50")}>3. Controle</span>
                          </div>
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

                {/* Actions & Status */}
                <div className="flex items-center justify-between p-2 border-t bg-muted/20">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {img.status === 'done' && !img.usedFallback && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    )}
                    {img.status === 'done' && img.usedFallback && (
                      <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />
                    )}
                    {img.status === 'processing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span className="truncate max-w-[120px]">{img.originalFile.name}</span>
                    {img.status === 'done' && img.usedFallback && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-orange-300 text-orange-600 bg-orange-50">
                        Fallback
                      </Badge>
                    )}
                    {img.status === 'done' && img.verification && !img.verification.pass && !img.usedFallback && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-yellow-300 text-yellow-700 bg-yellow-50">
                        Mogelijke afwijking
                      </Badge>
                    )}
                    {img.status === 'done' && img.verification?.pass && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-green-300 text-green-700 bg-green-50">
                        <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                        Geverifieerd
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {img.status === 'done' && img.resultImage && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => downloadImage(img.resultImage!, index)}>
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download
                      </Button>
                    )}
                    {(img.status === 'error' || img.status === 'done') && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => processImage(img.id)}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Opnieuw
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => removeImage(img.id)}>
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
