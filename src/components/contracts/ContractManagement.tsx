
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Eye, Download, Send, Clock, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { getSignatureSessionsByVehicle } from "@/services/digitalSignatureService";
import { fetchVehicles } from "@/services/inventoryService";
import { Vehicle } from "@/types/inventory";

interface ContractOverview {
  vehicle: Vehicle;
  sessions: any[];
  latestStatus: "none" | "pending" | "signed" | "expired";
}

export const ContractManagement: React.FC = () => {
  const [contracts, setContracts] = useState<ContractOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      // Haal alle voertuigen op die verkocht zijn
      const vehicles = await fetchVehicles();
      const soldVehicles = vehicles.filter(v => 
        v.salesStatus === "verkocht_b2b" || v.salesStatus === "verkocht_b2c"
      );

      const contractOverviews: ContractOverview[] = soldVehicles.map(vehicle => {
        const sessions = getSignatureSessionsByVehicle(vehicle.id);
        
        let latestStatus: "none" | "pending" | "signed" | "expired" = "none";
        if (sessions.length > 0) {
          const latestSession = sessions[sessions.length - 1];
          latestStatus = latestSession.status;
        }

        return {
          vehicle,
          sessions,
          latestStatus
        };
      });

      setContracts(contractOverviews);
    } catch (error) {
      console.error("Error loading contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "signed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "expired":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "signed":
        return <Badge variant="default" className="bg-green-100 text-green-800">Ondertekend</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Wachtend</Badge>;
      case "expired":
        return <Badge variant="destructive">Verlopen</Badge>;
      default:
        return <Badge variant="outline">Geen contract</Badge>;
    }
  };

  const filteredContracts = contracts.filter(contract => 
    contract.vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.vehicle.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.vehicle.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: contracts.length,
    signed: contracts.filter(c => c.latestStatus === "signed").length,
    pending: contracts.filter(c => c.latestStatus === "pending").length,
    none: contracts.filter(c => c.latestStatus === "none").length
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Contracten laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Contract Beheer</h2>
        <p className="text-muted-foreground mt-2">
          Overzicht van alle koopcontracten en hun ondertekeningsstatus
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Totaal</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ondertekend</p>
                <p className="text-2xl font-bold text-green-600">{stats.signed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Wachtend</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Geen Contract</p>
                <p className="text-2xl font-bold text-gray-600">{stats.none}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Contracten Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Zoek op merk, model, kenteken of klant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voertuig</TableHead>
                <TableHead>Kenteken</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Contract Status</TableHead>
                <TableHead>Laatste Activiteit</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => {
                const latestSession = contract.sessions[contract.sessions.length - 1];
                
                return (
                  <TableRow key={contract.vehicle.id}>
                    <TableCell>
                      <div className="font-medium">
                        {contract.vehicle.brand} {contract.vehicle.model}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {contract.vehicle.color}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {contract.vehicle.licenseNumber}
                    </TableCell>
                    <TableCell>
                      {contract.vehicle.customerName || "Niet ingesteld"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(contract.latestStatus)}
                        {getStatusBadge(contract.latestStatus)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {latestSession ? (
                        <div className="text-sm">
                          <div>{new Date(latestSession.createdAt).toLocaleDateString('nl-NL')}</div>
                          {latestSession.status === "signed" && latestSession.signedAt && (
                            <div className="text-muted-foreground">
                              Ondertekend: {new Date(latestSession.signedAt).toLocaleDateString('nl-NL')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Geen activiteit</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {contract.latestStatus === "signed" && (
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                        
                        {contract.latestStatus === "pending" && (
                          <Button variant="outline" size="sm">
                            <Send className="h-4 w-4 mr-1" />
                            Herinnering
                          </Button>
                        )}
                        
                        {contract.latestStatus === "none" && (
                          <Button variant="default" size="sm">
                            <Send className="h-4 w-4 mr-1" />
                            Contract Versturen
                          </Button>
                        )}
                        
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredContracts.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Geen contracten gevonden</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
