import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Mail, User, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface EmailConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  emailType?: string;
  recipientInfo?: string;
  recipientEmail?: string;
  subject?: string;
  previewContent?: string;
}

const getEmailTypeDescription = (emailType?: string): string => {
  const descriptions: Record<string, string> = {
    contract_b2c_digital: "contract naar klant",
    contract_b2b_digital: "B2B contract",
    delivery_appointment: "afleverafspraak",
    cmr_supplier: "CMR naar leverancier",
    transport_pickup: "pickup document naar transporteur",
    bpm_huys: "BPM aanvraag naar Huys",
    vehicle_arrived: "voertuig aangekomen melding",
    license_registration: "kenteken registratie",
    payment_reminder: "betalingsherinnering",
    papers_reminder: "papieren herinnering"
  };
  
  return descriptions[emailType || ""] || "e-mail";
};

export const EmailConfirmDialog: React.FC<EmailConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  emailType,
  recipientInfo,
  recipientEmail,
  subject,
  previewContent,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            E-mail versturen - {getEmailTypeDescription(emailType)}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <div className="space-y-3">
                {recipientInfo && recipientEmail && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{recipientInfo}</div>
                      <div className="text-xs text-muted-foreground">{recipientEmail}</div>
                    </div>
                  </div>
                )}
                
                {subject && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Onderwerp</div>
                      <div className="text-sm font-medium text-foreground">{subject}</div>
                    </div>
                  </div>
                )}
              </div>

              {previewContent && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Voorbeeld inhoud:</div>
                    <div className="bg-muted/50 rounded-md p-3 max-h-[200px] overflow-y-auto">
                      <div className="text-sm whitespace-pre-wrap text-foreground">
                        {previewContent.substring(0, 500)}
                        {previewContent.length > 500 && "..."}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />
              <div className="text-sm font-medium text-foreground">
                Weet u zeker dat u deze e-mail wilt versturen?
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuleren</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            <Mail className="h-4 w-4 mr-2" />
            Ja, verstuur e-mail
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
