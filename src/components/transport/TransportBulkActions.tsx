
import React, { useState } from "react";
import { Mail, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImportStatus } from "@/types/inventory";

interface TransportBulkActionsProps {
  selectedVehicleIds: string[];
  onClearSelection: () => void;
  onSendBulkEmails: (vehicleIds: string[], transporterId: string) => void;
  onUpdateBulkStatus: (vehicleIds: string[], status: ImportStatus) => void;
}

export const TransportBulkActions: React.FC<TransportBulkActionsProps> = ({
  selectedVehicleIds,
  onClearSelection,
  onSendBulkEmails,
  onUpdateBulkStatus
}) => {
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [transporterId, setTransporterId] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ImportStatus>("aanvraag_ontvangen");

  const handleSendEmails = () => {
    if (transporterId) {
      onSendBulkEmails(selectedVehicleIds, transporterId);
      setIsEmailDialogOpen(false);
    }
  };

  const handleUpdateStatus = () => {
    onUpdateBulkStatus(selectedVehicleIds, selectedStatus);
    setIsStatusDialogOpen(false);
  };

  if (selectedVehicleIds.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded border mb-4">
        <span className="text-sm font-medium">{selectedVehicleIds.length} voertuig(en) geselecteerd</span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsEmailDialogOpen(true)}
        >
          <Mail className="mr-2 h-4 w-4" />
          Bulk e-mail versturen
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsStatusDialogOpen(true)}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Status wijzigen
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bulk e-mail versturen</DialogTitle>
            <DialogDescription>
              Verstuur pickup documenten naar een transporteur voor {selectedVehicleIds.length} geselecteerde voertuigen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="transporter">Selecteer transporteur</Label>
              <Select value={transporterId} onValueChange={setTransporterId}>
                <SelectTrigger id="transporter" className="mt-1">
                  <SelectValue placeholder="Selecteer transporteur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trans1">Easy Transport GmbH</SelectItem>
                  <SelectItem value="trans2">QuickMove Transport</SelectItem>
                  <SelectItem value="trans3">Euro Car Logistics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="emailContent">E-mail inhoud</Label>
              <Textarea 
                id="emailContent" 
                className="mt-1 h-40"
                value={emailContent} 
                onChange={(e) => setEmailContent(e.target.value)} 
                placeholder="Standaard e-mail template zal worden gebruikt als dit leeg blijft..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSendEmails} disabled={!transporterId}>Versturen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Status wijzigen</DialogTitle>
            <DialogDescription>
              Wijzig de transportstatus voor {selectedVehicleIds.length} geselecteerde voertuigen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="status">Selecteer nieuwe status</Label>
            <Select value={selectedStatus} onValueChange={(value: ImportStatus) => setSelectedStatus(value)}>
              <SelectTrigger id="status" className="mt-1">
                <SelectValue placeholder="Selecteer status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="niet_aangemeld">Niet aangemeld</SelectItem>
                <SelectItem value="aanvraag_ontvangen">Aanvraag ontvangen</SelectItem>
                <SelectItem value="goedgekeurd">Goedgekeurd</SelectItem>
                <SelectItem value="bpm_betaald">BPM Betaald</SelectItem>
                <SelectItem value="ingeschreven">Ingeschreven</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleUpdateStatus}>Bijwerken</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
