import React from "react";
import { Link } from "react-router-dom";
import { Vehicle, PaymentStatus, PaintStatus } from "@/types/inventory";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Mail, FileText, Truck, CheckCircle2, CalendarCheck } from "lucide-react";
import { getChecklistProgress } from "@/lib/checklistProgress";
import { formatDeliveryMoment } from "@/components/werkplaats/deliveryAppointment";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface VehicleMobileCardProps {
  vehicle: Vehicle;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onSendEmail: (type: string, vehicleId: string) => void;
  onChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  onDeliveryConfirm: (vehicleId: string) => void;
  onOpenContractConfig?: (vehicle: Vehicle, contractType: "b2b" | "b2c") => void;
  onInvoiceRequest?: (vehicle: Vehicle) => void;
  /** Eerstvolgende afleverafspraak (ISO), uit useDeliveryMoments */
  deliveryAppointment?: string;
  /** Checklist-voortgang tonen (Verkocht B2C) */
  showChecklist?: boolean;
}

export const VehicleMobileCard: React.FC<VehicleMobileCardProps> = ({
  vehicle,
  onSelectVehicle,
  onSendEmail,
  onChangeStatus,
  onDeliveryConfirm,
  onOpenContractConfig,
  onInvoiceRequest,
  deliveryAppointment,
  showChecklist = false,
}) => {
  const progress = getChecklistProgress(vehicle);
  const getPaymentStatusBadge = (status: PaymentStatus | undefined) => {
    if (!status || status === 'niet_betaald') return null;
    
    const variants: Record<PaymentStatus, { label: string; className: string }> = {
      niet_betaald: { label: '', className: '' },
      aanbetaling: { label: 'Aanbetaling', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      volledig_betaald: { label: 'Betaald', className: 'bg-green-100 text-green-800 border-green-300' },
    };

    const config = variants[status];
    return config ? <Badge variant="outline" className={config.className}>{config.label}</Badge> : null;
  };

  const getPaintStatusBadge = (status: PaintStatus | undefined) => {
    if (!status || status === 'geen_behandeling') return null;
    
    const variants: Record<PaintStatus, { label: string; className: string }> = {
      geen_behandeling: { label: '', className: '' },
      hersteld: { label: 'Hersteld', className: 'bg-green-100 text-green-800 border-green-300' },
      in_behandeling: { label: 'In behandeling', className: 'bg-blue-100 text-blue-800 border-blue-300' },
    };

    const config = variants[status];
    return config ? <Badge variant="outline" className={config.className}>{config.label}</Badge> : null;
  };

  return (
    <Card 
      className="mb-3 touch-manipulation cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelectVehicle(vehicle)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-base leading-tight">
              {vehicle.brand} {vehicle.model}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">{vehicle.licenseNumber}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectVehicle(vehicle); }}>
                <FileText className="mr-2 h-4 w-4" />
                Details bekijken
              </DropdownMenuItem>
              <DropdownMenuItem asChild onClick={(e) => e.stopPropagation()}>
                <Link to={`/contracten/nieuw?vehicleId=${vehicle.id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Koopcontract B2C — digitaal ondertekenen
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSendEmail('payment_received', vehicle.id); }}>
                <Mail className="mr-2 h-4 w-4" />
                Betaling ontvangen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSendEmail('ready_for_pickup', vehicle.id); }}>
                <Mail className="mr-2 h-4 w-4" />
                Klaar voor ophalen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeliveryConfirm(vehicle.id); }}>
                <Truck className="mr-2 h-4 w-4" />
                Markeer als afgeleverd
              </DropdownMenuItem>
              {onChangeStatus && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onChangeStatus(vehicle.id, 'voorraad'); }}>
                  Terug naar voorraad
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex gap-2 mt-3 flex-wrap">
          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
            B2C
          </Badge>
          {getPaymentStatusBadge(vehicle.paymentStatus)}
          {getPaintStatusBadge(vehicle.paintStatus)}
          {vehicle.deliveryDate && (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Afgeleverd
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {(deliveryAppointment || showChecklist) && (
          <div className="flex flex-col gap-2 mb-3">
            {deliveryAppointment && (
              <Badge className="text-xs bg-blue-500 text-white border-blue-600 hover:bg-blue-600 w-fit font-semibold">
                <CalendarCheck className="h-3 w-3 mr-1" />
                Aflevering {formatDeliveryMoment(deliveryAppointment)}
              </Badge>
            )}
            {showChecklist && (
              <div className="flex items-center gap-2" data-testid="mobile-checklist-progress">
                <span className="text-xs font-medium whitespace-nowrap">
                  {progress.hasItems
                    ? `Checklist ${progress.percentage}% (${progress.completed}/${progress.total})`
                    : "Checklist —"}
                </span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${progress.percentage === 100 ? "bg-emerald-500" : progress.percentage >= 50 ? "bg-blue-500" : progress.percentage > 0 ? "bg-orange-500" : "bg-muted"}`}
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {vehicle.sellingPrice && (
            <>
              <dt className="text-muted-foreground">Verkoopprijs:</dt>
              <dd className="font-semibold text-primary">€{vehicle.sellingPrice.toLocaleString('nl-NL')}</dd>
            </>
          )}
          
          {vehicle.customerName && (
            <>
              <dt className="text-muted-foreground">Klant:</dt>
              <dd className="font-medium truncate">{vehicle.customerName}</dd>
            </>
          )}
          
          {vehicle.deliveryDate && (
            <>
              <dt className="text-muted-foreground">Afgeleverd op:</dt>
              <dd>{format(new Date(vehicle.deliveryDate), 'dd MMM yyyy', { locale: nl })}</dd>
            </>
          )}

          {vehicle.year && (
            <>
              <dt className="text-muted-foreground">Bouwjaar:</dt>
              <dd>{vehicle.year}</dd>
            </>
          )}
          
          {vehicle.mileage && (
            <>
              <dt className="text-muted-foreground">Kilometerstand:</dt>
              <dd>{vehicle.mileage.toLocaleString('nl-NL')} km</dd>
            </>
          )}
        </dl>
      </CardContent>
    </Card>
  );
};
