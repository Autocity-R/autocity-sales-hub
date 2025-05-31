
import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sync, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  ExternalLink 
} from "lucide-react";

interface CalendarSyncStatusProps {
  appointmentId: string;
  googleEventId?: string;
  syncStatus?: string;
  onSyncComplete?: () => void;
}

export const CalendarSyncStatus: React.FC<CalendarSyncStatusProps> = ({
  appointmentId,
  googleEventId,
  syncStatus,
  onSyncComplete
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(syncStatus || 'pending');
  const { toast } = useToast();

  const getSyncStatusIcon = () => {
    switch (currentStatus) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Sync className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSyncStatusLabel = () => {
    switch (currentStatus) {
      case 'synced':
        return 'Gesynchroniseerd';
      case 'error':
        return 'Sync fout';
      case 'pending':
        return 'Wacht op sync';
      default:
        return 'Niet gesynchroniseerd';
    }
  };

  const getSyncStatusColor = () => {
    switch (currentStatus) {
      case 'synced':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendar-sync', {
        body: {
          action: 'sync_to_google',
          appointmentId: appointmentId,
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setCurrentStatus('synced');
        toast({
          title: "Synchronisatie Voltooid",
          description: "Afspraak succesvol gesynchroniseerd met Google Calendar",
        });
        onSyncComplete?.();
      } else {
        throw new Error(data?.error || 'Synchronisatie mislukt');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setCurrentStatus('error');
      toast({
        title: "Synchronisatiefout",
        description: "Kon afspraak niet synchroniseren met Google Calendar",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const openInGoogleCalendar = () => {
    if (googleEventId) {
      window.open(`https://calendar.google.com/calendar/event?eid=${googleEventId}`, '_blank');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge className={getSyncStatusColor()}>
        {getSyncStatusIcon()}
        <span className="ml-1">{getSyncStatusLabel()}</span>
      </Badge>

      {currentStatus === 'pending' || currentStatus === 'error' ? (
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          size="sm"
          variant="outline"
          className="gap-1"
        >
          {isSyncing ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Sync className="h-3 w-3" />
          )}
          Sync
        </Button>
      ) : googleEventId ? (
        <Button
          onClick={openInGoogleCalendar}
          size="sm"
          variant="outline"
          className="gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          Open in Google
        </Button>
      ) : null}
    </div>
  );
};
