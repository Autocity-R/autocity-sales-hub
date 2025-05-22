
import React from "react";
import { CustomerHistoryItem, SupplierHistoryItem } from "@/types/customer";
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineIcon,
  TimelineContent,
} from "@/components/ui/timeline";
import { format } from "date-fns";
import { 
  Clock, 
  Phone, 
  ShoppingCart, 
  User, 
  CreditCard, 
  FileText 
} from "lucide-react";

interface ContactHistoryProps {
  history: (CustomerHistoryItem | SupplierHistoryItem)[];
}

const ContactHistory: React.FC<ContactHistoryProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Geen historische gegevens beschikbaar
      </div>
    );
  }

  const getIconForType = (actionType: string) => {
    switch (actionType) {
      case 'lead':
        return <User />;
      case 'contact':
        return <Phone />;
      case 'purchase':
        return <ShoppingCart />;
      case 'sale':
        return <CreditCard />;
      default:
        return <FileText />;
    }
  };

  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Contactgeschiedenis</h3>
      
      <Timeline>
        {sortedHistory.map((item, index) => (
          <TimelineItem key={item.id}>
            {index < sortedHistory.length - 1 && <TimelineConnector />}
            <TimelineIcon>
              {getIconForType(item.actionType)}
            </TimelineIcon>
            <TimelineContent>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    {item.actionType === 'lead' ? 'Nieuwe lead' :
                     item.actionType === 'contact' ? 'Contact moment' :
                     item.actionType === 'purchase' ? 'Aankoop' :
                     item.actionType === 'sale' ? 'Verkoop' : 'Actie'}
                  </h4>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(item.date), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
                <p>{item.description}</p>
                {item.vehicleName && (
                  <p className="text-sm text-muted-foreground">
                    Voertuig: {item.vehicleName}
                  </p>
                )}
              </div>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </div>
  );
};

export default ContactHistory;
