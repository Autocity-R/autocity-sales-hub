import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
  Scan,
} from "lucide-react";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/button";

GlobalWorkerOptions.workerSrc = workerUrl;

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

interface PdfPageProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
}

const PdfPage: React.FC<PdfPageProps> = ({ document, pageNumber, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | null = null;

    void document.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;

      const viewport = page.getViewport({ scale });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      });
      return renderTask.promise;
    }).catch((error: unknown) => {
      if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) {
        console.error("PDF-pagina renderen mislukt:", error);
      }
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber, scale]);

  return (
    <canvas
      ref={canvasRef}
      className="block max-w-none bg-background shadow-sm"
      aria-label={`Pagina ${pageNumber}`}
    />
  );
};

interface PdfViewerProps {
  url?: string | null;
  fileName?: string;
  className?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  fileName = "koopcontract.pdf",
  className = "",
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [basePageWidth, setBasePageWidth] = useState(0);
  const [fitScale, setFitScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [fitMode, setFitMode] = useState(true);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(
    url ? null : "Dit contract heeft geen geldige downloadlink. Vernieuw het dossier en probeer opnieuw.",
  );

  useEffect(() => {
    setDocument(null);
    setBasePageWidth(0);
    setError(url ? null : "Dit contract heeft geen geldige downloadlink. Vernieuw het dossier en probeer opnieuw.");
    setLoading(Boolean(url));
    if (!url) return;

    const task = getDocument({ url });
    void task.promise.then(async (loadedDocument) => {
      const firstPage = await loadedDocument.getPage(1);
      setDocument(loadedDocument);
      setBasePageWidth(firstPage.getViewport({ scale: 1 }).width);
      setFitMode(true);
      setLoading(false);
    }).catch((loadError: unknown) => {
      console.error("PDF laden mislukt:", loadError);
      setError("Het contract kon niet worden geladen. De downloadlink kan verlopen of ongeldig zijn.");
      setLoading(false);
    });

    return () => {
      void task.destroy();
    };
  }, [url]);

  const updateFitScale = useCallback(() => {
    if (!viewportRef.current || !basePageWidth) return;
    const availableWidth = Math.max(viewportRef.current.clientWidth - 24, 1);
    const nextFitScale = Math.min(availableWidth / basePageWidth, MAX_SCALE);
    setFitScale(nextFitScale);
    if (fitMode) setScale(nextFitScale);
  }, [basePageWidth, fitMode]);

  useEffect(() => {
    updateFitScale();
    if (!viewportRef.current) return;
    const observer = new ResizeObserver(updateFitScale);
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [updateFitScale]);

  const setZoom = (nextScale: number) => {
    setFitMode(false);
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale)));
  };

  const fitToWidth = () => {
    setFitMode(true);
    setScale(fitScale);
  };

  const distanceBetweenTouches = (touches: React.TouchList) => {
    const first = touches.item(0);
    const second = touches.item(1);
    if (!first || !second) return 0;
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;
    pinchRef.current = {
      distance: distanceBetweenTouches(event.touches),
      scale,
    };
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || !pinchRef.current) return;
    event.preventDefault();
    const distance = distanceBetweenTouches(event.touches);
    if (!distance || !pinchRef.current.distance) return;
    setZoom(pinchRef.current.scale * (distance / pinchRef.current.distance));
  };

  return (
    <div className={`flex min-h-0 w-full flex-col overflow-hidden border bg-muted/40 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background p-2">
        <div className="flex items-center gap-1" aria-label="PDF zoominstellingen">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="touch-target"
            onClick={() => setZoom(scale - 0.15)}
            disabled={!document || scale <= MIN_SCALE}
            title="Uitzoomen"
          >
            <Minus className="h-4 w-4" />
            <span className="sr-only">Uitzoomen</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="touch-target"
            onClick={() => setZoom(scale + 0.15)}
            disabled={!document || scale >= MAX_SCALE}
            title="Inzoomen"
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Inzoomen</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setZoom(1)} disabled={!document}>
            100%
          </Button>
          <Button type="button" variant={fitMode ? "secondary" : "outline"} size="sm" onClick={fitToWidth} disabled={!document}>
            <Scan className="mr-1 h-4 w-4" />
            Passend
          </Button>
          <span className="hidden min-w-12 text-center text-xs text-muted-foreground sm:inline">
            {Math.round(scale * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" asChild={Boolean(url)} disabled={!url}>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Openen in nieuw tabblad</span>
                <span className="sm:hidden">Openen</span>
              </a>
            ) : <span>Openen</span>}
          </Button>
          <Button variant="outline" size="sm" asChild={Boolean(url)} disabled={!url}>
            {url ? (
              <a href={url} download={fileName}>
                <Download className="mr-1 h-4 w-4" />
                Downloaden
              </a>
            ) : <span>Downloaden</span>}
          </Button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="min-h-0 w-full flex-1 overflow-auto overscroll-contain p-3"
        style={{ touchAction: "pan-x pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { pinchRef.current = null; }}
      >
        {loading && (
          <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Contract laden…
          </div>
        )}
        {error && (
          <div className="mx-auto flex min-h-64 max-w-lg flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="font-medium text-foreground">Contract niet beschikbaar</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
        {document && !error && (
          <div className="flex w-max min-w-full flex-col items-center gap-3">
            {Array.from({ length: document.numPages }, (_, index) => (
              <PdfPage key={index + 1} document={document} pageNumber={index + 1} scale={scale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};