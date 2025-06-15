
import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { manualSyncToGoogle } from "@/services/calendarService";
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  Zap 
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

  useEffect(() => {
    setCurrentStatus(syncStatus || 'pending');
    console.log('📊 Sync status for appointment', appointmentId, ':', syncStatus);
  }, [syncStatus, appointmentId]);

  const getSyncStatusIcon = () => {
    switch (currentStatus) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSyncStatusLabel = () => {
    switch (currentStatus) {
      case 'synced':
        return 'Auto-sync ✓';
      case 'error':
        return 'Sync fout';
      case 'pending':
        return 'Auto-sync...';
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
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    console.log('🔄 Manual sync triggered for appointment:', appointmentId);
    
    try {
      const success = await manualSyncToGoogle(appointmentId);

      if (success) {
        setCurrentStatus('synced');
        toast({
          title: "Handmatige Sync Voltooid",
          description: "Afspraak succesvol gesynchroniseerd met Google Calendar",
        });
        onSyncComplete?.();
      } else {
        throw new Error('Synchronisatie mislukt');
      }
    } catch (error) {
      console.error('Manual sync error:', error);
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

      {/* Handmatige sync knop tonen als automatische sync gefaald heeft */}
      {currentStatus === 'error' ? (
        <Button
          onClick={handleManualSync}
          disabled={isSyncing}
          size="sm"
          variant="outline"
          className="gap-1"
          title="Probeer handmatig te synchroniseren"
        >
          {isSyncing ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Zap className="h-3 w-3" />
          )}
          Opnieuw
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
