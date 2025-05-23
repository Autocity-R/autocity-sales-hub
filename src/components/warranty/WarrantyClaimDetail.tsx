
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  Car, 
  User, 
  Calendar, 
  Euro, 
  Star,
  CheckCircle,
  Mail,
  Edit,
  Save,
  X
} from "lucide-react";
import { WarrantyClaim } from "@/types/warranty";
import { useToast } from "@/hooks/use-toast";

interface WarrantyClaimDetailProps {
  claim: WarrantyClaim;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (claimId: string, updates: Partial<WarrantyClaim>) => void;
  onResolve: (claimId: string, resolutionData: {
    resolutionDescription: string;
    actualCost: number;
    customerSatisfaction: number;
  }) => void;
}

export const WarrantyClaimDetail: React.FC<WarrantyClaimDetailProps> = ({
  claim,
  isOpen,
  onClose,
  onUpdate,
  onResolve
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedClaim, setEditedClaim] = useState(claim);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionData, setResolutionData] = useState({
    resolutionDescription: "",
    actualCost: claim.estimatedCost,
    customerSatisfaction: 5
  });
  const { toast } = useToast();

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "dd MMMM yyyy", { locale: nl });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      actief: { color: "bg-blue-100 text-blue-800", label: "Actief" },
      in_behandeling: { color: "bg-yellow-100 text-yellow-800", label: "In behandeling" },
      opgelost: { color: "bg-green-100 text-green-800", label: "Opgelost" },
      vervallen: { color: "bg-gray-100 text-gray-800", label: "Vervallen" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.actief;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      kritiek: { color: "bg-red-100 text-red-800", label: "Kritiek" },
      hoog: { color: "bg-orange-100 text-orange-800", label: "Hoog" },
      normaal: { color: "bg-blue-100 text-blue-800", label: "Normaal" },
      laag: { color: "bg-gray-100 text-gray-800", label: "Laag" }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normaal;
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const handleSave = () => {
    onUpdate(claim.id, editedClaim);
    setIsEditing(false);
    toast({
      title: "Claim bijgewerkt",
      description: "De garantieclaim is succesvol bijgewerkt.",
    });
  };

  const handleResolve = () => {
    onResolve(claim.id, resolutionData);
    setShowResolveDialog(false);
    onClose();
    toast({
      title: "Claim afgewikkeld",
      description: "De garantieclaim is succesvol afgewikkeld.",
    });
  };

  const handleSendReadyEmail = () => {
    // In een echte implementatie zou dit een API call zijn
    toast({
      title: "Email verzonden",
      description: `Email verzonden naar ${claim.customerName} dat de auto gereed staat.`,
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Garantieclaim #{claim.id}</span>
              <div className="flex gap-2">
                {getStatusBadge(claim.status)}
                {getPriorityBadge(claim.priority)}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Voertuig Informatie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Voertuig Informatie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Merk & Model</p>
                  <p className="font-medium">{claim.vehicleBrand} {claim.vehicleModel}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kenteken</p>
                  <p className="font-medium">{claim.vehicleLicenseNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leverdatum</p>
                  <p className="font-medium">{formatDate(claim.deliveryDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Garantie periode</p>
                  <p className="font-medium">
                    {formatDate(claim.warrantyStartDate)} - {formatDate(claim.warrantyEndDate)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Klant Informatie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Klant Informatie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Naam</p>
                  <p className="font-medium">{claim.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Datum gemeld</p>
                  <p className="font-medium">{formatDate(claim.reportDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Toegewezen aan</p>
                  <p className="font-medium">{claim.assignedTo || "Nog niet toegewezen"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Claim Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Claim Details
                {!isEditing && claim.status !== "opgelost" && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Bewerken
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Probleem omschrijving</label>
                {isEditing ? (
                  <Textarea
                    value={editedClaim.problemDescription}
                    onChange={(e) => setEditedClaim({
                      ...editedClaim,
                      problemDescription: e.target.value
                    })}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1">{claim.problemDescription}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  {isEditing ? (
                    <Select
                      value={editedClaim.status}
                      onValueChange={(value) => setEditedClaim({
                        ...editedClaim,
                        status: value as any
                      })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="actief">Actief</SelectItem>
                        <SelectItem value="in_behandeling">In behandeling</SelectItem>
                        <SelectItem value="vervallen">Vervallen</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">{getStatusBadge(claim.status)}</div>
                  )}
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Prioriteit</label>
                  {isEditing ? (
                    <Select
                      value={editedClaim.priority}
                      onValueChange={(value) => setEditedClaim({
                        ...editedClaim,
                        priority: value as any
                      })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kritiek">Kritiek</SelectItem>
                        <SelectItem value="hoog">Hoog</SelectItem>
                        <SelectItem value="normaal">Normaal</SelectItem>
                        <SelectItem value="laag">Laag</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">{getPriorityBadge(claim.priority)}</div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Extra informatie</label>
                {isEditing ? (
                  <Textarea
                    value={editedClaim.additionalNotes}
                    onChange={(e) => setEditedClaim({
                      ...editedClaim,
                      additionalNotes: e.target.value
                    })}
                    className="mt-1"
                    placeholder="Extra informatie..."
                  />
                ) : (
                  <p className="mt-1">{claim.additionalNotes || "Geen extra informatie"}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Geschatte kosten</label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedClaim.estimatedCost}
                    onChange={(e) => setEditedClaim({
                      ...editedClaim,
                      estimatedCost: parseFloat(e.target.value) || 0
                    })}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 font-medium text-orange-600">
                    {formatCurrency(claim.estimatedCost)}
                  </p>
                )}
              </div>

              {claim.loanCarAssigned && (
                <div>
                  <p className="text-sm text-muted-foreground">Leenauto</p>
                  <p className="mt-1 text-green-600">
                    ✓ Toegewezen: {claim.loanCarDetails?.licenseNumber || "Onbekend"}
                  </p>
                </div>
              )}

              {isEditing && (
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Opslaan
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Annuleren
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acties */}
          <div className="flex gap-2 pt-4">
            {claim.status !== "opgelost" && (
              <>
                <Button onClick={() => setShowResolveDialog(true)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Claim Afwikkelen
                </Button>
                <Button variant="outline" onClick={handleSendReadyEmail}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email: Auto Gereed
                </Button>
              </>
            )}
            {claim.status === "opgelost" && claim.resolutionDate && (
              <div className="text-sm text-muted-foreground">
                Opgelost op {formatDate(claim.resolutionDate)}
                {claim.resolutionDescription && `: ${claim.resolutionDescription}`}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim Afwikkelen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Oplossing omschrijving</label>
              <Textarea
                value={resolutionData.resolutionDescription}
                onChange={(e) => setResolutionData({
                  ...resolutionData,
                  resolutionDescription: e.target.value
                })}
                placeholder="Beschrijf hoe het probleem is opgelost..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Werkelijke kosten (€)</label>
              <Input
                type="number"
                value={resolutionData.actualCost}
                onChange={(e) => setResolutionData({
                  ...resolutionData,
                  actualCost: parseFloat(e.target.value) || 0
                })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Klanttevredenheid (1-5 sterren)</label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={resolutionData.customerSatisfaction}
                  onChange={(e) => setResolutionData({
                    ...resolutionData,
                    customerSatisfaction: parseInt(e.target.value) || 5
                  })}
                  className="w-20"
                />
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= resolutionData.customerSatisfaction
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={handleResolve} className="bg-green-600 hover:bg-green-700">
              Claim Afwikkelen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
