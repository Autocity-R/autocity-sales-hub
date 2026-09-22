import React from "react";
import { FileText, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PdfViewer } from "@/components/contracts/PdfViewer";
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="flex h-[calc(100dvh-1.5rem)] max-h-[95dvh] max-w-6xl flex-col overflow-hidden">
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
          <div className="flex items-center justify-between pr-10">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={metadata?.contractType === "b2c" ? "bg-blue-50 text-blue-800" : "bg-purple-50 text-purple-800"}>
                  {metadata?.contractType === "b2c" ? "B2C (Particulier)" : "B2B (Zakelijk)"}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(contract.createdAt), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
              </div>
              <div className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="truncate">{contract.name}</span>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <PdfViewer
          url={contract.url || contract.fileUrl}
          fileName={contract.fileName || contract.name}
          className="flex-1"
        />
      </DialogContent>
    </Dialog>
  );
};
