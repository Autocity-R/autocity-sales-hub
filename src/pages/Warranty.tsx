
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Plus, 
  Search, 
  Filter,
  Car,
  Clock,
  Euro,
  Star,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { WarrantyClaim, WarrantyStats } from "@/types/warranty";
import { fetchWarrantyClaims, getWarrantyStats } from "@/services/warrantyService";
import { WarrantyClaimsTable } from "@/components/warranty/WarrantyClaimsTable";
import { WarrantyForm } from "@/components/warranty/WarrantyForm";
import { WarrantyStatsCards } from "@/components/warranty/WarrantyStatsCards";
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
  DialogTrigger,
} from "@/components/ui/dialog";

const Warranty = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  // Fetch warranty claims
  const { data: claims = [], isLoading: claimsLoading, error: claimsError } = useQuery({
    queryKey: ["warrantyClaims"],
    queryFn: fetchWarrantyClaims
  });

  // Fetch warranty stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["warrantyStats"],
    queryFn: getWarrantyStats
  });

  const handleClaimCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["warrantyClaims"] });
    queryClient.invalidateQueries({ queryKey: ["warrantyStats"] });
    setShowCreateForm(false);
  };

  // Filter claims based on search and filters
  const filteredClaims = claims.filter((claim: WarrantyClaim) => {
    // Search query filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchFields = [
        claim.customerName,
        claim.vehicleBrand,
        claim.vehicleModel,
        claim.vehicleLicenseNumber,
        claim.problemDescription
      ];
      if (!searchFields.some(field => field.toLowerCase().includes(query))) {
        return false;
      }
    }

    // Status filtering
    if (statusFilter !== "all" && claim.status !== statusFilter) {
      return false;
    }

    // Priority filtering  
    if (priorityFilter !== "all" && claim.priority !== priorityFilter) {
      return false;
    }

    // Tab filtering
    if (activeTab === "active" && claim.status === "opgelost") {
      return false;
    }
    if (activeTab === "resolved" && claim.status !== "opgelost") {
      return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
  };

  // Show active filters count
  const activeFiltersCount = [
    searchQuery !== "",
    statusFilter !== "all",
    priorityFilter !== "all",
  ].filter(Boolean).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Garantiebeheer" 
          description="Beheer voertuiggaranties, claims en klanttevredenheid"
        >
          <div className="flex space-x-2">
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe Claim
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nieuwe Garantieclaim</DialogTitle>
                </DialogHeader>
                <WarrantyForm onClose={handleClaimCreated} />
              </DialogContent>
            </Dialog>
          </div>
        </PageHeader>

        {/* Stats Cards */}
        <WarrantyStatsCards stats={stats} isLoading={statsLoading} />

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Zoeken op klant, voertuig, probleem..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="actief">Actief</SelectItem>
              <SelectItem value="in_behandeling">In behandeling</SelectItem>
              <SelectItem value="opgelost">Opgelost</SelectItem>
              <SelectItem value="vervallen">Vervallen</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Prioriteit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle prioriteiten</SelectItem>
              <SelectItem value="kritiek">Kritiek</SelectItem>
              <SelectItem value="hoog">Hoog</SelectItem>
              <SelectItem value="normaal">Normaal</SelectItem>
              <SelectItem value="laag">Laag</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <Button variant="outline" onClick={clearFilters}>
              Wis filters ({activeFiltersCount})
            </Button>
          )}
        </div>

        {/* Claims Table with Tabs */}
        <div className="bg-white rounded-md shadow">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Actieve Claims ({claims.filter(c => c.status !== 'opgelost').length})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Opgeloste Claims ({claims.filter(c => c.status === 'opgelost').length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="mt-0">
              <WarrantyClaimsTable 
                claims={filteredClaims}
                isLoading={claimsLoading}
                error={claimsError}
              />
            </TabsContent>
            
            <TabsContent value="resolved" className="mt-0">
              <WarrantyClaimsTable 
                claims={filteredClaims}
                isLoading={claimsLoading}
                error={claimsError}
                showResolved={true}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Warranty;
