import React from "react";
import { Bell, BellOff, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  disablePush,
  enablePush,
  getPushStatus,
  isIos,
  isStandalone,
} from "@/lib/push";

type Variant = "card" | "row";

/** Meldingen-toggle — zichtbaar voor élke rol, werkt op desktop en in de PWA op de telefoon. */
export const PushNotificationToggle: React.FC<{ variant?: Variant }> = ({ variant = "card" }) => {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<{ supported: boolean; subscribed: boolean }>({
    supported: true,
    subscribed: false,
  });

  const refresh = React.useCallback(async () => {
    const s = await getPushStatus();
    setStatus({ supported: s.supported, subscribed: s.subscribed });
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      const res = next ? await enablePush() : await disablePush();
      if (!res.ok) {
        toast({ title: "Meldingen niet gelukt", description: res.error, variant: "destructive" });
      } else {
        toast({
          title: next ? "Meldingen staan aan" : "Meldingen staan uit",
          description: next
            ? "Je krijgt vanaf nu meldingen op dit apparaat."
            : "Dit apparaat ontvangt geen meldingen meer.",
        });
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const iosHint = isIos() && !isStandalone();

  if (variant === "row") {
    return (
      <button
        type="button"
        disabled={busy || !status.supported}
        onClick={() => void toggle(!status.subscribed)}
        className="w-full flex items-center gap-3 px-3 rounded-xl min-h-[48px] text-[14px] font-medium text-slate-800 active:bg-slate-100 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin text-slate-500" />
        ) : status.subscribed ? (
          <Bell className="h-[18px] w-[18px] text-blue-600" />
        ) : (
          <BellOff className="h-[18px] w-[18px] text-slate-500" />
        )}
        <span className="flex-1 text-left">
          {status.subscribed ? "Meldingen staan aan" : "🔔 Meldingen aanzetten"}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-900">
            <Bell className="h-4 w-4 text-slate-500" /> Meldingen op dit apparaat
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            Krijg direct bericht bij nieuwe garantie-mail, een auto die binnenkomt, een klus die klaar
            is om te keuren en wanneer een klant te lang op antwoord wacht.
          </p>
          {iosHint && (
            <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-800">
              <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
              Op de iPhone moet de app eerst op je beginscherm staan: Safari → deel-knop → “Zet op
              beginscherm”. Start de app daarvandaan en zet meldingen dan aan.
            </p>
          )}
          {!status.supported && (
            <p className="mt-2 text-[12px] text-slate-400">
              Deze browser ondersteunt geen meldingen.
            </p>
          )}
        </div>
        <div className="shrink-0 pt-1">
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : (
            <Switch
              checked={status.subscribed}
              disabled={!status.supported}
              onCheckedChange={(v) => void toggle(v)}
              aria-label="Meldingen aan of uit"
            />
          )}
        </div>
      </div>
      {status.subscribed && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-9 text-[12px] text-slate-500"
          onClick={() => void toggle(false)}
        >
          Meldingen uitzetten op dit apparaat
        </Button>
      )}
    </div>
  );
};

export default PushNotificationToggle;