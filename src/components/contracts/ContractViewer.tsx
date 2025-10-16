import React from "react";
import { X, Download, FileText, Calendar, User } from "lucide-react";
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
import { StoredContract } from "@/services/contractStorageService";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import DOMPurify from 'dompurify';

interface ContractViewerProps {
  contract: StoredContract;
  onClose: () => void;
}

export const ContractViewer: React.FC<ContractViewerProps> = ({
  contract,
  onClose,
}) => {
  const handleDownload = () => {
    // Create a blob with the HTML content
    const blob = new Blob([contract.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = contract.fileName.replace('.pdf', '.html');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(contract.htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
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
                <Badge variant="outline" className={contract.contractType === "b2c" ? "bg-blue-50 text-blue-800" : "bg-purple-50 text-purple-800"}>
                  {contract.contractType === "b2c" ? "B2C (Particulier)" : "B2B (Zakelijk)"}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(contract.createdAt, "d MMMM yyyy 'om' HH:mm", { locale: nl })}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {contract.fileName}
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
        
        {/* Contract Content */}
        <div className="flex-1 overflow-auto bg-white">
          <div 
            className="w-full h-full"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(contract.htmlContent, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'div', 'span'],
                ALLOWED_ATTR: ['class', 'style']
              })
            }}
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
