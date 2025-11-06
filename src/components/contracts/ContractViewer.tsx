import React from "react";
import { X, Download, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VehicleFile } from "@/types/inventory";
import { SavedContractMetadata } from "@/services/contractStorageService";
import { format } from "date-fns";
import { nl } from "date-fns/locale";


interface ContractViewerProps {
  contract: VehicleFile;
  onClose: () => void;
}

export const ContractViewer: React.FC<ContractViewerProps> = ({
  contract,
  onClose,
}) => {
  const metadata = contract.metadata as SavedContractMetadata | undefined;
  
  const handleDownload = () => {
    // Open the PDF URL
    window.open(contract.url, '_blank');
  };

  const handlePrint = () => {
    // Open PDF in new window for printing
    const printWindow = window.open(contract.url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Koopcontract
          </DialogTitle>
          <DialogDescription>
            Bekijk het koopcontract voor dit voertuig
          </DialogDescription>
        </DialogHeader>
        
        {/* Contract Info Bar */}
        <div className="flex-shrink-0 bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={metadata?.contractType === "b2c" ? "bg-blue-50 text-blue-800" : "bg-purple-50 text-purple-800"}>
                  {metadata?.contractType === "b2c" ? "B2C (Particulier)" : "B2B (Zakelijk)"}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(contract.createdAt), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {contract.name}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <FileText className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Contract Content - PDF Viewer */}
        <div className="flex-1 overflow-auto bg-white">
          <iframe
            title="Contract Content"
            src={contract.url}
            className="w-full h-full"
            style={{ minHeight: '600px' }}
          />
        </div>
        
        {/* Close button */}
        <Button
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 rounded-sm"
          variant="ghost"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Sluiten</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
};
