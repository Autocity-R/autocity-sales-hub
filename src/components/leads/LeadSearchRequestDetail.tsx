
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LeadSearchRequest } from "@/types/leads";
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Car, 
  Calendar, 
  Euro,
  Gauge,
  FileText,
  Clock,
  UserCheck
} from "lucide-react";
import { format } from "date-fns";

interface LeadSearchRequestDetailProps {
  request: LeadSearchRequest;
  isOpen: boolean;
  onClose: () => void;
}

export const LeadSearchRequestDetail: React.FC<LeadSearchRequestDetailProps> = ({
  request,
  isOpen,
  onClose
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'fulfilled': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actief';
      case 'fulfilled': return 'Vervuld';
      case 'expired': return 'Verlopen';
      case 'cancelled': return 'Geannuleerd';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Zoekopdracht Details - {request.leadName}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status en Prioriteit */}
          <div className="flex gap-3">
            <Badge className={getStatusColor(request.status)}>
              {getStatusLabel(request.status)}
            </Badge>
            <Badge variant="outline" className={getPriorityColor(request.priority)}>
              Prioriteit: {request.priority}
            </Badge>
          </div>

          {/* Klant Informatie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Klant Informatie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-sm text-muted-foreground">Naam</label>
                  <p className="text-lg font-semibold">{request.leadName}</p>
                </div>
                
                {request.leadEmail && (
                  <div>
                    <label className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </label>
                    <p>{request.leadEmail}</p>
                  </div>
                )}
                
                {request.leadPhone && (
                  <div>
                    <label className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Telefoon
                    </label>
                    <p>{request.leadPhone}</p>
                  </div>
                )}
                
                <div>
                  <label className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    Toegewezen aan
                  </label>
                  <p>{request.assignedTo}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gezochte Auto Specificaties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Gezochte Auto Specificaties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="font-medium text-sm text-muted-foreground">Merk</label>
                  <p className="text-lg font-semibold">{request.requestedBrand}</p>
                </div>
                
                <div>
                  <label className="font-medium text-sm text-muted-foreground">Model</label>
                  <p className="text-lg font-semibold">{request.requestedModel}</p>
                </div>
                
                {request.requestedYear && (
                  <div>
                    <label className="font-medium text-sm text-muted-foreground">Minimaal Bouwjaar</label>
                    <p className="text-lg">{request.requestedYear}</p>
                  </div>
                )}
                
                {request.requestedFuelType && (
                  <div>
                    <label className="font-medium text-sm text-muted-foreground">Brandstof</label>
                    <p>{request.requestedFuelType}</p>
                  </div>
                )}
                
                {request.requestedTransmission && (
                  <div>
                    <label className="font-medium text-sm text-muted-foreground">Transmissie</label>
                    <p>{request.requestedTransmission}</p>
                  </div>
                )}
                
                {request.maxKilometers && (
                  <div>
                    <label className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                      <Gauge className="h-3 w-3" />
                      Maximaal Kilometers
                    </label>
                    <p>{request.maxKilometers.toLocaleString()} km</p>
                  </div>
                )}
              </div>

              {/* Budget Informatie */}
              {(request.minPrice || request.maxPrice) && (
                <div className="mt-6">
                  <label className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-2">
                    <Euro className="h-3 w-3" />
                    Budget
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-green-600">
                      €{request.minPrice?.toLocaleString() || 0}
                    </span>
                    <span className="text-muted-foreground">tot</span>
                    <span className="text-lg font-semibold text-green-600">
                      €{request.maxPrice?.toLocaleString() || 'onbeperkt'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tijdsinformatie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tijdsinformatie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Aangemaakt op
                  </label>
                  <p>{format(new Date(request.requestDate), 'dd MMMM yyyy')}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(request.requestDate), 'HH:mm')}
                  </p>
                </div>
                
                {request.expiryDate && (
                  <div>
                    <label className="font-medium text-sm text-muted-foreground">
                      Vervaldatum
                    </label>
                    <p>{format(new Date(request.expiryDate), 'dd MMMM yyyy')}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.expiryDate), 'HH:mm')}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="font-medium text-sm text-muted-foreground">
                    Laatst bijgewerkt
                  </label>
                  <p>{format(new Date(request.updatedAt), 'dd MMMM yyyy')}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(request.updatedAt), 'HH:mm')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extra Informatie/Notities */}
          {request.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Extra Informatie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{request.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notificatie Instellingen */}
          <Card>
            <CardHeader>
              <CardTitle>Notificatie Instellingen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={request.notifyWhenAvailable ? "default" : "secondary"}>
                  {request.notifyWhenAvailable ? "Notificaties AAN" : "Notificaties UIT"}
                </Badge>
                {request.lastNotified && (
                  <span className="text-sm text-muted-foreground">
                    Laatst genotificeerd: {format(new Date(request.lastNotified), 'dd/MM/yyyy HH:mm')}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
