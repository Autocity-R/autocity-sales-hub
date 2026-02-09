import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Circle, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getVehicleByToken } from "@/services/checklistAccessService";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface ChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  completedByName?: string;
  createdAt: string;
  createdByName?: string;
}

const ChecklistView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [vehicle, setVehicle] = useState<any>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (token) loadVehicle();
  }, [token]);

  const loadVehicle = async () => {
    try {
      setLoading(true);
      const data = await getVehicleByToken(token!);

      // Check if vehicle is still in verkocht_b2c status
      if (data.status !== "verkocht_b2c") {
        setError("expired");
        return;
      }

      setVehicle(data);
      const items = (data.details as any)?.preDeliveryChecklist || [];
      setChecklist(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (itemId: string) => {
    if (!vehicle || toggling) return;
    setToggling(itemId);

    try {
      const updatedChecklist = checklist.map((item) => {
        if (item.id === itemId) {
          const nowCompleted = !item.completed;
          return {
            ...item,
            completed: nowCompleted,
            completedAt: nowCompleted ? new Date().toISOString() : undefined,
            completedByName: nowCompleted ? "Medewerker (via QR)" : undefined,
          };
        }
        return item;
      });

      // Update in database
      const updatedDetails = {
        ...(vehicle.details || {}),
        preDeliveryChecklist: updatedChecklist,
      };

      const { error: updateError } = await supabase
        .from("vehicles")
        .update({ details: updatedDetails })
        .eq("id", vehicle.id);

      if (updateError) throw updateError;

      setChecklist(updatedChecklist);
      setVehicle({ ...vehicle, details: updatedDetails });
    } catch (err) {
      console.error("Toggle error:", err);
    } finally {
      setToggling(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMM yyyy", { locale: nl });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <h1 className="text-xl font-bold mb-2">Link Verlopen</h1>
          <p className="text-muted-foreground">
            Dit voertuig is inmiddels afgeleverd. De checklist is niet meer beschikbaar.
          </p>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-bold mb-2">Fout</h1>
          <p className="text-muted-foreground">{error || "Voertuig niet gevonden"}</p>
        </div>
      </div>
    );
  }

  const completedCount = checklist.filter((i) => i.completed).length;
  const totalCount = checklist.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const licensePlate = vehicle.license_number || "-";
  const details = vehicle.details || {};

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-5">
        <h1 className="text-lg font-bold">
          {vehicle.brand} {vehicle.model}
        </h1>
        <p className="text-2xl font-bold mt-1">{licensePlate}</p>
      </div>

      {/* Vehicle Info */}
      <div className="px-4 py-3 border-b grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Kleur</span>
          <p className="font-medium">{vehicle.color || "-"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">VIN</span>
          <p className="font-medium text-xs">{vehicle.vin || "-"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Bouwjaar</span>
          <p className="font-medium">{vehicle.year || "-"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Import</span>
          <p className="font-medium">
            {(details as any)?.importStatus || vehicle.import_status || "-"}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 py-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Voortgang</span>
          <Badge variant={progress === 100 ? "default" : "secondary"}>
            {completedCount}/{totalCount}
          </Badge>
        </div>
        <Progress value={progress} className="h-3" />
        <p className="text-xs text-muted-foreground mt-1 text-center">{progress}% voltooid</p>
      </div>

      {/* Checklist Items */}
      <div className="divide-y">
        {checklist.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground">
            Geen taken in de checklist
          </div>
        ) : (
          checklist.map((item) => (
            <div
              key={item.id}
              className={`px-4 py-3 flex items-start gap-3 ${
                item.completed ? "bg-green-50 dark:bg-green-950/20" : ""
              }`}
            >
              <div className="pt-0.5">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => handleToggle(item.id)}
                  disabled={toggling === item.id}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    item.completed ? "text-green-700 dark:text-green-400" : ""
                  }`}
                >
                  {item.description}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.completed && item.completedAt ? (
                    <span className="text-green-600">
                      ✓ {item.completedByName} · {formatDate(item.completedAt)}
                    </span>
                  ) : (
                    <span>Toegevoegd: {formatDate(item.createdAt)}</span>
                  )}
                </p>
              </div>
              {toggling === item.id && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChecklistView;
