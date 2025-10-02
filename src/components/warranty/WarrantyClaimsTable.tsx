
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  Eye, 
  Car, 
  Calendar, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Star
} from "lucide-react";
import { WarrantyClaim } from "@/types/warranty";
import { WarrantyClaimDetail } from "./WarrantyClaimDetail";
import { updateWarrantyClaim, resolveWarrantyClaim } from "@/services/warrantyService";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface WarrantyClaimsTableProps {
  claims: WarrantyClaim[];
  isLoading: boolean;
  error: unknown;
  showResolved?: boolean;
}

export const WarrantyClaimsTable: React.FC<WarrantyClaimsTableProps> = ({
  claims,
  isLoading,
  error,
  showResolved = false
}) => {
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "dd MMM yyyy", { locale: nl });
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

  const getDaysInWarranty = (claim: WarrantyClaim) => {
    const today = new Date();
    const reportDate = new Date(claim.reportDate);
    const diffTime = Math.abs(today.getTime() - reportDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleUpdateClaim = async (claimId: string, updates: Partial<WarrantyClaim>) => {
    try {
      await updateWarrantyClaim(claimId, updates);
      queryClient.invalidateQueries({ queryKey: ["warrantyClaims"] });
      queryClient.invalidateQueries({ queryKey: ["warrantyStats"] });
      toast({
        title: "Claim bijgewerkt",
        description: "De garantieclaim is succesvol bijgewerkt.",
      });
    } catch (error) {
      console.error("Error updating claim:", error);
      toast({
        title: "Fout bij bijwerken",
        description: "Er is een fout opgetreden bij het bijwerken van de claim.",
        variant: "destructive"
      });
    }
  };

  const handleResolveClaim = async (
    claimId: string, 
    resolutionData: {
      resolutionDescription: string;
      actualCost: number;
      customerSatisfaction: number;
    }
  ) => {
    console.log("Resolving claim:", claimId, resolutionData);
    try {
      await resolveWarrantyClaim(claimId, resolutionData);
      queryClient.invalidateQueries({ queryKey: ["warrantyClaims"] });
      queryClient.invalidateQueries({ queryKey: ["warrantyStats"] });
      toast({
        title: "Claim afgewikkeld",
        description: "De garantieclaim is succesvol afgewikkeld.",
      });
    } catch (error) {
      console.error("Error resolving claim:", error);
      toast({
        title: "Fout bij afwikkelen",
        description: "Er is een fout opgetreden bij het afwikkelen van de claim.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-10 w-full mb-4" />
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full mb-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500">Fout bij het laden van garantieclaims</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Voertuig</TableHead>
            <TableHead>Klant</TableHead>
            <TableHead>Probleem</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prioriteit</TableHead>
            <TableHead>Leen Auto</TableHead>
            <TableHead>Datum Gemeld</TableHead>
            {showResolved ? (
              <>
                <TableHead>Opgelost</TableHead>
                <TableHead>Kosten</TableHead>
                <TableHead>Tevredenheid</TableHead>
              </>
            ) : (
              <>
                <TableHead>Dagen Open</TableHead>
                <TableHead>Geschatte Kosten</TableHead>
              </>
            )}
            <TableHead>Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showResolved ? 11 : 10} className="text-center py-8 text-muted-foreground">
                Geen garantieclaims gevonden
              </TableCell>
            </TableRow>
          ) : (
            claims.map((claim) => (
              <TableRow 
                key={claim.id} 
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => setSelectedClaim(claim)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium">{claim.vehicleBrand} {claim.vehicleModel}</div>
                      <div className="text-sm text-muted-foreground">{claim.vehicleLicenseNumber}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{claim.customerName}</div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate" title={claim.problemDescription}>
                    {claim.problemDescription}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(claim.status)}
                </TableCell>
                <TableCell>
                  {getPriorityBadge(claim.priority)}
                </TableCell>
                <TableCell>
                  {claim.loanCarAssigned ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">{claim.loanCarDetails?.licenseNumber || "Toegewezen"}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-500">
                      <span className="text-sm">Niet toegewezen</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatDate(claim.reportDate)}</span>
                  </div>
                </TableCell>
                {showResolved ? (
                  <>
                    <TableCell>
                      {claim.resolutionDate ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{formatDate(claim.resolutionDate)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-red-600">
                        {formatCurrency(claim.actualCost || claim.estimatedCost)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {claim.customerSatisfaction ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span>{claim.customerSatisfaction}/5</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">{getDaysInWarranty(claim)} dagen</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-orange-600">
                        {formatCurrency(claim.estimatedCost)}
                      </span>
                    </TableCell>
                  </>
                )}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedClaim(claim)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Warranty Claim Detail Dialog */}
      {selectedClaim && (
        <WarrantyClaimDetail
          claim={selectedClaim}
          isOpen={!!selectedClaim}
          onClose={() => setSelectedClaim(null)}
          onUpdate={handleUpdateClaim}
          onResolve={handleResolveClaim}
        />
      )}
    </>
  );
};
