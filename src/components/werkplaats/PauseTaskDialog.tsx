import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pause } from "lucide-react";

const SNELLE_REDENEN = [
  "Wacht op onderdeel",
  "Wacht op goedkeuring",
  "Auto niet beschikbaar",
  "Spoedklus ertussen",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (reason: string) => void;
  busy?: boolean;
}

/** Kleine dialog om een klus te pauzeren met (optionele) reden. */
export const PauseTaskDialog: React.FC<Props> = ({ open, onOpenChange, onConfirm, busy }) => {
  const [reason, setReason] = useState("");

  const confirm = () => {
    onConfirm(reason);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setReason(""); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="h-4 w-4" /> Klus pauzeren
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-[13px] text-slate-600">
            De gewerkte tijd wordt bewaard. Je kunt later verdergaan waar je gebleven was.
          </p>
          <div className="flex flex-wrap gap-2">
            {SNELLE_REDENEN.map(r => (
              <Button key={r} type="button" variant="outline" size="sm"
                className="h-9 text-[12.5px]"
                onClick={() => setReason(r)}>
                {r}
              </Button>
            ))}
          </div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reden (optioneel) — bijv. wacht op onderdeel"
            rows={3}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11">Annuleren</Button>
          <Button onClick={confirm} disabled={busy}
            className="h-11 bg-amber-600 hover:bg-amber-700 text-white font-semibold">
            <Pause className="h-4 w-4 mr-1" /> Pauzeren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PauseTaskDialog;
