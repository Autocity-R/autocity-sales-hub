import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, CalendarOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Appointment } from "@/types/calendar";
import { CalendarSyncStatus } from "@/components/calendar/CalendarSyncStatus";
import {
  BRANCH_LABELS,
  BRANCH_COLOR_CLASSES,
  BranchCode,
} from "@/contexts/BranchContext";

interface Props {
  appointments: Appointment[];
  onSyncComplete?: () => void;
}

interface BranchCalRow {
  branch: string;
  auth_type: string | null;
  sync_enabled: boolean | null;
  calendar_email: string | null;
  service_account_email: string | null;
  google_calendar_id: string | null;
}

const BRANCHES: BranchCode[] = ["rotterdam", "heerhugowaard"];

/**
 * Toont de sync-status per vestiging (Rotterdam, Heerhugowaard).
 * Rotterdam blijft "actief" zolang de bestaande service-account config staat;
 * Heerhugowaard toont "Nog niet geconfigureerd" totdat de google-config is aangemaakt.
 */
export const BranchSyncStatusPanel: React.FC<Props> = ({ appointments, onSyncComplete }) => {
  const [settings, setSettings] = useState<Record<string, BranchCalRow>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("company_calendar_settings")
        .select("branch, auth_type, sync_enabled, calendar_email, service_account_email, google_calendar_id")
        .eq("company_id", "auto-city");
      const map: Record<string, BranchCalRow> = {};
      (data ?? []).forEach((row: any) => {
        if (row.branch) map[row.branch] = row;
      });
      setSettings(map);
    })();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {BRANCHES.map((branch) => {
        const cfg = settings[branch];
        const configured =
          !!cfg &&
          cfg.auth_type === "service_account" &&
          !!cfg.calendar_email &&
          cfg.sync_enabled !== false;

        const branchAppts = appointments.filter(
          (a) => (a.branch ?? "rotterdam") === branch,
        );
        const synced = branchAppts.filter((a) => a.sync_status === "synced").length;
        const pending = branchAppts.filter((a) => a.sync_status === "pending").length;
        const errored = branchAppts.filter((a) => a.sync_status === "error").length;
        const notConfiguredCount = branchAppts.filter(
          (a) => a.sync_status === "no_calendar",
        ).length;
        const recent = [...branchAppts]
          .sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
          )
          .slice(0, 5);

        return (
          <Card key={branch}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${BRANCH_COLOR_CLASSES[branch]}`}>
                    {BRANCH_LABELS[branch]}
                  </span>
                  <span>Google Calendar</span>
                </span>
                {configured ? (
                  <Badge className="bg-green-100 text-green-800 border border-green-200">
                    <CheckCircle className="mr-1 h-3 w-3" /> Actief
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-700 border border-gray-200">
                    <CalendarOff className="mr-1 h-3 w-3" /> Nog niet geconfigureerd
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!configured ? (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Google-account volgt
                  </div>
                  <p className="mt-1 text-yellow-700">
                    Zodra het Google-account voor deze vestiging bestaat wordt hier de service-account koppeling gemaakt. Tot dan worden nieuwe afspraken lokaal opgeslagen zonder Google-sync.
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Impersoneert: <code className="rounded bg-muted px-1">{cfg?.calendar_email}</code>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded bg-green-50 p-2">
                  <div className="text-lg font-bold text-green-600">{synced}</div>
                  <div className="text-green-700">Gesynct</div>
                </div>
                <div className="rounded bg-yellow-50 p-2">
                  <div className="text-lg font-bold text-yellow-600">{pending}</div>
                  <div className="text-yellow-700">Wacht</div>
                </div>
                <div className="rounded bg-red-50 p-2">
                  <div className="text-lg font-bold text-red-600">{errored}</div>
                  <div className="text-red-700">Fout</div>
                </div>
                <div className="rounded bg-gray-50 p-2">
                  <div className="text-lg font-bold text-gray-600">{notConfiguredCount}</div>
                  <div className="text-gray-700">Geen agenda</div>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-medium">Recente afspraken</h4>
                {recent.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nog geen afspraken voor deze vestiging.</p>
                ) : (
                  recent.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded border p-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {format(new Date(a.startTime), "dd MMM yyyy HH:mm")}
                        </div>
                      </div>
                      <CalendarSyncStatus
                        appointmentId={a.id}
                        googleEventId={a.googleEventId}
                        syncStatus={a.sync_status || "pending"}
                        onSyncComplete={onSyncComplete}
                      />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};