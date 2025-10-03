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

interface EmailConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  emailType?: string;
  recipientInfo?: string;
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
  recipientInfo
}) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>E-mail versturen?</AlertDialogTitle>
          <AlertDialogDescription>
            Weet je zeker dat je de{" "}
            <span className="font-semibold">{getEmailTypeDescription(emailType)}</span>
            {recipientInfo && (
              <>
                {" "}naar <span className="font-semibold">{recipientInfo}</span>
              </>
            )}{" "}
            wilt versturen?
            <br />
            <br />
            Deze actie kan niet ongedaan worden gemaakt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuleren</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Ja, verstuur e-mail
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
