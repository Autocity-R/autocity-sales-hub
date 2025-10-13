import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Car, 
  Calendar,
  Target,
  Trophy,
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SalespersonDetailDialog } from "./SalespersonDetailDialog";

interface SalespersonData {
  id: string;
  name: string;
  email: string;
  totalSales: number;
  totalRevenue: number;
  totalMargin: number;
  averageMargin: number;
  vehiclesSold: Vehicle[];
  monthlyPerformance: MonthlyPerformance[];
  rank: number;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  selling_price: number;
  margin: number;
  sold_date: string;
  purchase_price: number;
}

interface MonthlyPerformance {
  month: string;
  sales: number;
  revenue: number;
  margin: number;
}

export const SalespersonPerformance: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("totalRevenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedPeriod, setSelectedPeriod] = useState("currentYear");
  const [selectedSalesperson, setSelectedSalesperson] = useState<SalespersonData | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fetch salesperson performance data
  const { data: salespersonData, isLoading } = useQuery({
    queryKey: ["salesperson-performance", selectedPeriod],
    queryFn: async (): Promise<SalespersonData[]> => {
      // Get date range based on selected period
      const now = new Date();
      let startDate: Date;
      
      switch (selectedPeriod) {
        case "currentMonth":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "lastMonth":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case "currentQuarter":
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        default: // currentYear
          startDate = new Date(now.getFullYear(), 0, 1);
      }

      // Fetch sold vehicles with their details
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select(`
          id, brand, model, selling_price, sold_date, sold_by_user_id,
          details
        `)
        .not('sold_date', 'is', null)
        .not('sold_by_user_id', 'is', null)
        .gte('sold_date', startDate.toISOString());

      if (!vehicles) return [];

      // Prepare map keyed by salesperson id
      const salespersonMap = new Map<string, SalespersonData>();

      // Calculate performance metrics from vehicles, deriving salesperson info from vehicle details
      vehicles.forEach((vehicle) => {
        const sellerId = (vehicle as any).sold_by_user_id as string | null;
        if (!sellerId) return;

        const vDetails = ((vehicle as any).details as any) || {};
        const salespersonName = vDetails?.salespersonName || 'Onbekend';
        const salespersonEmail = vDetails?.salespersonEmail || '';

        if (!salespersonMap.has(sellerId)) {
          salespersonMap.set(sellerId, {
            id: sellerId,
            name: salespersonName,
            email: salespersonEmail,
            totalSales: 0,
            totalRevenue: 0,
            totalMargin: 0,
            averageMargin: 0,
            vehiclesSold: [],
            monthlyPerformance: [],
            rank: 0,
          });
        }

        const salesperson = salespersonMap.get(sellerId)!;

        const sellingPrice = (vehicle as any).selling_price || 0;
        const purchasePrice = vDetails?.purchasePrice || 0;
        const margin = sellingPrice - purchasePrice;

        salesperson.totalSales += 1;
        salesperson.totalRevenue += sellingPrice;
        salesperson.totalMargin += margin;
        salesperson.vehiclesSold.push({
          id: (vehicle as any).id,
          brand: (vehicle as any).brand,
          model: (vehicle as any).model,
          selling_price: sellingPrice,
          margin: margin,
          sold_date: (vehicle as any).sold_date!,
          purchase_price: purchasePrice,
        });
      });

      // Calculate average margin and rank
      const salespeople = Array.from(salespersonMap.values())
        .filter(sp => sp.totalSales > 0)
        .map(sp => ({
          ...sp,
          averageMargin: sp.totalRevenue > 0 ? (sp.totalMargin / sp.totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .map((sp, index) => ({
          ...sp,
          rank: index + 1
        }));

      return salespeople;
    },
    refetchOnWindowFocus: false
  });

  // Filter and sort data
  const filteredData = React.useMemo(() => {
    if (!salespersonData) return [];
    
    let filtered = salespersonData.filter(sp => 
      sp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sp.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof SalespersonData] as number;
      const bValue = b[sortBy as keyof SalespersonData] as number;
      
      if (sortOrder === "asc") {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return filtered;
  }, [salespersonData, searchTerm, sortBy, sortOrder]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500 text-white";
    if (rank === 2) return "bg-gray-400 text-white";
    if (rank === 3) return "bg-amber-600 text-white";
    return "bg-gray-200 text-gray-700";
  };

  const getPerformanceBadge = (margin: number) => {
    if (margin >= 20) return <Badge className="bg-green-500">Excellent</Badge>;
    if (margin >= 15) return <Badge className="bg-blue-500">Goed</Badge>;
    if (margin >= 10) return <Badge className="bg-yellow-500">Gemiddeld</Badge>;
    return <Badge variant="destructive">Verbetering nodig</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Performance data laden...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SalespersonDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        salesperson={selectedSalesperson}
      />
      
      <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Verkoper Performance
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Detailanalyse van alle verkoper prestaties
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="currentMonth">Deze maand</SelectItem>
                  <SelectItem value="lastMonth">Vorige maand</SelectItem>
                  <SelectItem value="currentQuarter">Dit kwartaal</SelectItem>
                  <SelectItem value="currentYear">Dit jaar</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek verkoper..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-[200px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Totale Omzet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(filteredData.reduce((sum, sp) => sum + sp.totalRevenue, 0))}
            </div>
            <p className="text-sm text-muted-foreground">
              Alle verkopers gecombineerd
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Totaal Verkocht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredData.reduce((sum, sp) => sum + sp.totalSales, 0)}
            </div>
            <p className="text-sm text-muted-foreground">
              Voertuigen deze periode
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Gem. Marge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredData.length > 0 
                ? (filteredData.reduce((sum, sp) => sum + sp.averageMargin, 0) / filteredData.length).toFixed(1)
                : 0}%
            </div>
            <p className="text-sm text-muted-foreground">
              Alle verkopers gemiddeld
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Salesperson Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Verkoper Rankings</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totalRevenue">Omzet</SelectItem>
                  <SelectItem value="totalSales">Verkopen</SelectItem>
                  <SelectItem value="averageMargin">Marge %</SelectItem>
                  <SelectItem value="totalMargin">Totale Marge</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredData.map((salesperson) => (
              <Card key={salesperson.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Salesperson Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(salesperson.rank)}`}>
                          #{salesperson.rank}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{salesperson.name}</h3>
                          <p className="text-sm text-muted-foreground">{salesperson.email}</p>
                        </div>
                        {getPerformanceBadge(salesperson.averageMargin)}
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:flex-none lg:w-96">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Omzet</span>
                        </div>
                        <div className="text-lg font-bold">{formatCurrency(salesperson.totalRevenue)}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Car className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">Verkocht</span>
                        </div>
                        <div className="text-lg font-bold">{salesperson.totalSales}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium">Marge %</span>
                        </div>
                        <div className="text-lg font-bold">{salesperson.averageMargin.toFixed(1)}%</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Target className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium">Winst</span>
                        </div>
                        <div className="text-lg font-bold">{formatCurrency(salesperson.totalMargin)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Sales - Max 5 */}
                  {salesperson.vehiclesSold.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Laatste 5 Verkopen
                        </h4>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedSalesperson(salesperson);
                            setDetailDialogOpen(true);
                          }}
                          className="text-primary hover:text-primary"
                        >
                          Bekijk alle {salesperson.vehiclesSold.length} verkopen
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {salesperson.vehiclesSold
                          .sort((a, b) => new Date(b.sold_date).getTime() - new Date(a.sold_date).getTime())
                          .slice(0, 5)
                          .map((vehicle) => (
                            <div key={vehicle.id} className="bg-muted/50 rounded-lg p-3 text-sm hover:bg-muted/70 transition-colors">
                              <div className="font-medium">{vehicle.brand} {vehicle.model}</div>
                              <div className="text-muted-foreground">
                                {formatCurrency(vehicle.selling_price)} • 
                                Marge: {formatCurrency(vehicle.margin)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {vehicle.sold_date ? new Date(vehicle.sold_date).toLocaleDateString('nl-NL') : 'Geen datum'}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredData.length === 0 && (
              <div className="text-center py-8">
                <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Geen verkoper data gevonden</h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? "Probeer andere zoektermen of wijzig de periode" 
                    : "Er zijn geen verkopen gevonden voor de geselecteerde periode"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
};