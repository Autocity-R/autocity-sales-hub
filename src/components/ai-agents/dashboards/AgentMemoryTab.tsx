import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const TYPE_COLORS: Record<string, string> = {
  correctie: "bg-red-100 text-red-700 border-red-200",
  werkwijze: "bg-blue-100 text-blue-700 border-blue-200",
  voorkeur: "bg-purple-100 text-purple-700 border-purple-200",
  uitzondering: "bg-yellow-100 text-yellow-700 border-yellow-200",
  gesprek: "bg-gray-100 text-gray-700 border-gray-200",
};

interface Props {
  agentName: string;
}

export const AgentMemoryTab: React.FC<Props> = ({ agentName }) => {
  const queryClient = useQueryClient();

  const { data: memories, isLoading } = useQuery({
    queryKey: ["agent-memory", agentName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_memory")
        .select("*")
        .eq("agent_name", agentName)
        .eq("actief", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleDeactivate = async (id: string) => {
    const { error } = await supabase
      .from("agent_memory")
      .update({ actief: false })
      .eq("id", id);
    if (error) {
      toast.error("Kon geheugen item niet deactiveren");
    } else {
      toast.success("Geheugen item gedeactiveerd");
      queryClient.invalidateQueries({ queryKey: ["agent-memory", agentName] });
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Geheugen laden...</div>;
  }

  if (!memories || memories.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{agentName} heeft nog geen geheugen opgebouwd.</p>
          <p className="text-xs mt-1">Corrigeer of leg werkwijzen uit in de chat — {agentName} onthoudt het automatisch.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Geheugen van {agentName} ({memories.length} items)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {memories.map((m: any) => (
          <div key={m.id} className="flex items-start justify-between gap-3 p-2 rounded border text-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[m.type] || TYPE_COLORS.gesprek}`}>
                  {m.type}
                </Badge>
                <span className="font-medium truncate">{m.onderwerp}</span>
              </div>
              <p className="text-muted-foreground text-xs">{m.inhoud}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {m.updated_at ? format(new Date(m.updated_at), "d MMM yyyy HH:mm", { locale: nl }) : "—"}
                {m.bron && ` · ${m.bron}`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleDeactivate(m.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
