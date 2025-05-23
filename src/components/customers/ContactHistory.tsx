
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
  FileText,
  Car
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
                
                {/* Enhanced vehicle information */}
                {item.vehicleId && (
                  <div className="mt-2 bg-muted/50 p-3 rounded-md border">
                    <div className="flex items-start gap-2">
                      <Car className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="space-y-1 w-full">
                        <p className="font-medium">{item.vehicleName}</p>
                        
                        {/* Display additional vehicle details if available */}
                        {item.vehicleDetails && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            {item.vehicleBrand && (
                              <p><span className="text-muted-foreground">Merk:</span> {item.vehicleBrand}</p>
                            )}
                            {item.vehicleModel && (
                              <p><span className="text-muted-foreground">Model:</span> {item.vehicleModel}</p>
                            )}
                            {item.vehicleYear && (
                              <p><span className="text-muted-foreground">Bouwjaar:</span> {item.vehicleYear}</p>
                            )}
                            {item.vehicleMileage && (
                              <p><span className="text-muted-foreground">Km stand:</span> {item.vehicleMileage.toLocaleString()} km</p>
                            )}
                            {item.vehicleVin && (
                              <p className="col-span-2"><span className="text-muted-foreground">VIN:</span> {item.vehicleVin}</p>
                            )}
                            {item.vehiclePrice && (
                              <p className="col-span-2 font-medium">
                                <span className="text-muted-foreground">
                                  {item.actionType === 'purchase' ? 'Aankoopprijs:' : 'Verkoopprijs:'}
                                </span> 
                                € {item.vehiclePrice.toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
