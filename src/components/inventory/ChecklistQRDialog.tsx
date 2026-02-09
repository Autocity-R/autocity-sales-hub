import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, RefreshCw, AlertTriangle, Monitor } from "lucide-react";
import { Vehicle } from "@/types/inventory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getOrCreateChecklistToken, buildChecklistUrl } from "@/services/checklistAccessService";
import {
  checkDymoEnvironment,
  getDymoPrinters,
  generateLabelXml,
  printDymoLabel,
  LABEL_FORMATS,
  type DymoPrinter,
  type DymoEnvironment,
  type LabelFormat,
} from "@/services/dymoService";

interface ChecklistQRDialogProps {
  vehicle: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChecklistQRDialog: React.FC<ChecklistQRDialogProps> = ({
  vehicle,
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [checklistUrl, setChecklistUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [dymoEnv, setDymoEnv] = useState<DymoEnvironment | null>(null);
  const [printers, setPrinters] = useState<DymoPrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<LabelFormat>(LABEL_FORMATS[0]);

  useEffect(() => {
    if (open) {
      initializeDialog();
    }
  }, [open, vehicle.id]);

  const initializeDialog = async () => {
    setLoading(true);
    try {
      // Generate token and URL
      const token = await getOrCreateChecklistToken(vehicle.id);
      const url = buildChecklistUrl(token);
      setChecklistUrl(url);

      // Check DYMO environment
      await refreshDymo();
    } catch (error) {
      console.error("Error initializing QR dialog:", error);
      toast({
        title: "Fout",
        description: "Kon QR code niet genereren",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshDymo = async () => {
    const env = await checkDymoEnvironment();
    setDymoEnv(env);

    if (env.isAvailable) {
      const availablePrinters = await getDymoPrinters();
      setPrinters(availablePrinters);
      if (availablePrinters.length > 0 && !selectedPrinter) {
        setSelectedPrinter(availablePrinters[0].name);
      }
    }
  };

  const handleDymoPrint = async () => {
    if (!selectedPrinter || !checklistUrl) return;

    setPrinting(true);
    try {
      const labelXml = generateLabelXml(
        checklistUrl,
        vehicle.brand,
        vehicle.model,
        vehicle.color || "",
        vehicle.licenseNumber || "",
        vehicle.vin || "",
        selectedFormat
      );

      await printDymoLabel(selectedPrinter, labelXml);

      toast({
        title: "Sticker geprint",
        description: `Label verstuurd naar ${selectedPrinter}`,
      });
    } catch (error) {
      console.error("Print error:", error);
      toast({
        title: "Print fout",
        description: error instanceof Error ? error.message : "Kon niet printen",
        variant: "destructive",
      });
    } finally {
      setPrinting(false);
    }
  };

  const handleBrowserPrint = () => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    const lp = vehicle.licenseNumber || "-";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Sticker - ${lp}</title>
        <style>
          @page { size: 57mm 32mm landscape; margin: 0; }
          * { box-sizing: border-box; }
          html, body { 
            margin: 0; padding: 2mm;
            font-family: Arial, Helvetica, sans-serif;
            display: flex; gap: 2mm;
            align-items: center;
            width: 57mm; height: 32mm;
            overflow: hidden;
          }
          @media print {
            html { width: 57mm; height: 32mm; }
          }
          .qr { flex-shrink: 0; }
          .qr img { width: 18mm; height: 18mm; }
          .info { flex: 1; overflow: hidden; }
          .brand { font-size: 7pt; font-weight: bold; margin-bottom: 0.5mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .color { font-size: 6pt; color: #555; margin-bottom: 1mm; }
          .plate { font-size: 8pt; font-weight: bold; margin-bottom: 0.5mm; }
          .vin { font-size: 5pt; color: #777; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        </style>
      </head>
      <body>
        <div class="qr">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checklistUrl)}" />
        </div>
        <div class="info">
          <div class="brand">${vehicle.brand} ${vehicle.model}</div>
          <div class="color">${vehicle.color || "-"}</div>
          <div class="plate">${lp}</div>
          <div class="vin">VIN: ${vehicle.vin || "-"}</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const licensePlate = vehicle.licenseNumber || "-";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print QR Sticker
          </DialogTitle>
          <DialogDescription>
            Sticker met QR code voor de checklist van dit voertuig
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sticker Preview - 57x32mm schaal */}
            <div className="border rounded-lg p-3 bg-white dark:bg-zinc-950">
              <p className="text-[10px] text-muted-foreground mb-2">Preview (DYMO 11354 — 57×32mm)</p>
              <div className="flex gap-2 items-center" style={{ maxWidth: '220px' }}>
                <QRCodeSVG value={checklistUrl} size={64} level="M" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[11px] truncate">
                    {vehicle.brand} {vehicle.model}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {vehicle.color || "-"}
                  </p>
                  <p className="font-bold text-xs">{licensePlate}</p>
                  <p className="text-[8px] text-muted-foreground truncate">
                    VIN: {vehicle.vin || "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* DYMO Printer Section */}
            {dymoEnv?.isAvailable && printers.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Printer</label>
                    <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {printers.map((p) => (
                          <SelectItem key={p.name} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Label formaat</label>
                    <Select
                      value={selectedFormat.id}
                      onValueChange={(id) => {
                        const fmt = LABEL_FORMATS.find((f) => f.id === id);
                        if (fmt) setSelectedFormat(fmt);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LABEL_FORMATS.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleDymoPrint}
                    disabled={printing || !selectedPrinter}
                    className="flex-1"
                  >
                    {printing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4 mr-2" />
                    )}
                    {printing ? "Printen..." : "Print naar DYMO"}
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleBrowserPrint} title="Print via browser">
                    <Monitor className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-medium">Geen DYMO printer gevonden</p>
                    <p className="mt-1">Zorg dat DYMO Label v8 actief is en de printer is aangesloten.</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={refreshDymo}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Opnieuw zoeken
                  </Button>
                  <Button onClick={handleBrowserPrint} className="flex-1">
                    <Monitor className="h-4 w-4 mr-2" />
                    Print via browser
                  </Button>
                </div>
              </div>
            )}

            {dymoEnv?.isAvailable && (
              <Badge variant="secondary" className="text-[10px]">
                ✓ DYMO Web Service verbonden
              </Badge>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
