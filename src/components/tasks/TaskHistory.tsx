import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchTaskHistory } from "@/services/taskService";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface TaskHistoryProps {
  taskId: string;
}

export const TaskHistory: React.FC<TaskHistoryProps> = ({ taskId }) => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["task-history", taskId],
    queryFn: () => fetchTaskHistory(taskId),
    enabled: !!taskId,
  });

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Geschiedenis laden...</div>;
  }

  if (history.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">Geen geschiedenis beschikbaar</div>;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'voltooid':
        return 'default';
      case 'in_uitvoering':
        return 'secondary';
      case 'toegewezen':
        return 'outline';
      case 'uitgesteld':
        return 'destructive';
      case 'geannuleerd':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Taak Geschiedenis</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {history.map((entry: any) => (
              <div key={entry.id} className="flex items-start space-x-3 pb-3 border-b last:border-b-0">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">
                      {entry.changed_by_profile?.first_name} {entry.changed_by_profile?.last_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: nl })}
                    </span>
                  </div>
                  
                  {entry.old_status && entry.new_status && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span>Status gewijzigd van</span>
                      <Badge variant={getStatusBadgeVariant(entry.old_status)} className="text-xs">
                        {entry.old_status}
                      </Badge>
                      <span>naar</span>
                      <Badge variant={getStatusBadgeVariant(entry.new_status)} className="text-xs">
                        {entry.new_status}
                      </Badge>
                    </div>
                  )}
                  
                  {entry.old_assignee && entry.new_assignee && (
                    <div className="text-sm text-muted-foreground">
                      Taak opnieuw toegewezen van {entry.old_assignee_profile?.first_name} {entry.old_assignee_profile?.last_name} 
                      naar {entry.new_assignee_profile?.first_name} {entry.new_assignee_profile?.last_name}
                    </div>
                  )}
                  
                  {entry.change_reason && (
                    <div className="text-sm text-muted-foreground italic">
                      {entry.change_reason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};