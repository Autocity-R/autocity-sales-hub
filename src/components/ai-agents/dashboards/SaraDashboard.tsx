import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Clock, AlertTriangle, Car, Link, Unlink, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { GarantieEmailInbox } from "./sara/GarantieEmailInbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateWarrantyClaim } from "@/services/warrantyService";
import { toast } from "@/hooks/use-toast";
import { AgentMemoryTab } from "./AgentMemoryTab";

export const SaraDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [linkingClaimId, setLinkingClaimId] = useState<string | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ['sara-dashboard'],
    queryFn: async () => {
      // Fetch open claims with loan car info
      const { data: claims, error } = await supabase
        .from('warranty_claims')
        .select('*, loan_vehicle:loan_car_id(id, brand, model, license_number)')
        .or('claim_status.eq.open,claim_status.eq.in_behandeling,claim_status.eq.pending');

      if (error) throw error;
      const items = claims || [];
      const now = Date.now();
      const DAY = 86400000;

      let totalOpen = items.length;
      let totalDays = 0;
      const oldClaims: any[] = [];

      items.forEach(c => {
        const days = Math.floor((now - new Date(c.created_at).getTime()) / DAY);
        totalDays += days;
        if (days > 14) {
          oldClaims.push({ ...c, days });
        }
      });

      const avgDays = totalOpen > 0 ? Math.round(totalDays / totalOpen) : 0;

      // Fetch loan car stats
      const { data: loanCars } = await supabase
        .from('vehicles')
        .select('id, brand, model, license_number')
        .eq('details->>isLoanCar', 'true');

      const allLoanCars = loanCars || [];
      const activeLoanCarIds = items
        .filter(c => c.loan_car_id)
        .map(c => c.loan_car_id);

      const inUse = activeLoanCarIds.length;
      const available = allLoanCars.filter(car => !activeLoanCarIds.includes(car.id));

      // Claims needing loan car
      const needingLoanCar = items.filter(c => c.loan_car_assigned && !c.loan_car_id);

      // Loan cars in use detail
      const loanCarsInUse = items
        .filter(c => c.loan_car_id && c.loan_vehicle)
        .map(c => ({
          claimId: c.id,
          car: c.loan_vehicle as any,
          customer: c.manual_customer_name || 'Onbekend',
          description: c.description?.slice(0, 50) || 'Geen beschrijving',
          days: Math.floor((now - new Date(c.created_at).getTime()) / DAY),
        }));

      // Fetch unread garantie emails count
      const { count: unreadEmails } = await supabase
        .from('garantie_emails' as any)
        .select('id', { count: 'exact', head: true })
        .eq('gelezen', false)
        .eq('richting', 'inkomend');

      return {
        totalOpen,
        avgDays,
        oldClaims: oldClaims.sort((a, b) => b.days - a.days),
        claims: items,
        loanCarStats: { total: allLoanCars.length, inUse, available },
        availableCars: available,
        needingLoanCar,
        loanCarsInUse,
        unreadEmails: unreadEmails || 0,
      };
    },
    refetchInterval: 60000,
  });

  const handleLinkCar = async (claimId: string) => {
    if (!selectedCarId) return;
    try {
      await updateWarrantyClaim(claimId, { loanCarId: selectedCarId });
      toast({ title: "Leenauto gekoppeld", description: "De leenauto is toegewezen aan de claim." });
      setLinkingClaimId(null);
      setSelectedCarId("");
      queryClient.invalidateQueries({ queryKey: ['sara-dashboard'] });
    } catch {
      toast({ title: "Fout", description: "Kon leenauto niet koppelen.", variant: "destructive" });
    }
  };

  const handleUnlinkCar = async (claimId: string) => {
    try {
      await updateWarrantyClaim(claimId, { loanCarId: null });
      toast({ title: "Leenauto losgekoppeld", description: "De leenauto is weer beschikbaar." });
      queryClient.invalidateQueries({ queryKey: ['sara-dashboard'] });
    } catch {
      toast({ title: "Fout", description: "Kon leenauto niet loskoppelen.", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="grid grid-cols-3 gap-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><ShieldAlert className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{data?.totalOpen || 0}</p><p className="text-xs text-muted-foreground">Open claims</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{data?.avgDays || 0}d</p><p className="text-xs text-muted-foreground">Gem. doorlooptijd</p></div>
          </CardContent>
        </Card>
        <Card className={data?.oldClaims?.length ? "border-destructive" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold">{data?.oldClaims?.length || 0}</p><p className="text-xs text-muted-foreground">&gt;14 dagen open</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Car className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{data?.loanCarStats?.inUse || 0}/{data?.loanCarStats?.total || 0}</p>
              <p className="text-xs text-muted-foreground">Leenauto's in gebruik</p>
            </div>
          </CardContent>
        </Card>
        <Card className={data?.unreadEmails ? "border-primary" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Mail className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{data?.unreadEmails || 0}</p><p className="text-xs text-muted-foreground">Ongelezen emails</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Claims needing loan car */}
      {data?.needingLoanCar && data.needingLoanCar.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="h-4 w-4 text-yellow-500" />
              Leenauto nodig ({data.needingLoanCar.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.needingLoanCar.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">🟡 Nodig</Badge>
                  <span className="font-medium">{c.claim_number || c.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground">{c.manual_customer_name || 'Onbekend'}</span>
                </div>
                <Popover open={linkingClaimId === c.id} onOpenChange={(open) => { setLinkingClaimId(open ? c.id : null); setSelectedCarId(""); }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Link className="h-3 w-3" /> Koppel auto
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Beschikbare leenauto's</p>
                      {data.availableCars.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Geen leenauto's beschikbaar</p>
                      ) : (
                        <>
                          <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer leenauto..." />
                            </SelectTrigger>
                            <SelectContent>
                              {data.availableCars.map((car: any) => (
                                <SelectItem key={car.id} value={car.id}>
                                  {car.brand} {car.model} — {car.license_number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" className="w-full" disabled={!selectedCarId} onClick={() => handleLinkCar(c.id)}>
                            Koppelen
                          </Button>
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Claims >14 days */}
      {data?.oldClaims && data.oldClaims.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Claims &gt;14 dagen</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.oldClaims.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.claim_number || c.id.slice(0, 8)}</span>
                  <Badge variant="destructive">{c.days}d</Badge>
                  {c.loan_car_assigned && !c.loan_car_id && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">🟡 Leenauto nodig</Badge>
                  )}
                  {c.loan_car_assigned && c.loan_car_id && c.loan_vehicle && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                      🟢 {(c.loan_vehicle as any).brand} {(c.loan_vehicle as any).model}
                    </Badge>
                  )}
                </div>
                <span className="text-muted-foreground">{c.description?.slice(0, 40) || 'Geen beschrijving'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Loan cars in use */}
      {data?.loanCarsInUse && data.loanCarsInUse.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" />
              Leenauto's in gebruik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leenauto</TableHead>
                  <TableHead>Kenteken</TableHead>
                  <TableHead>Bij klant</TableHead>
                  <TableHead>Claim</TableHead>
                  <TableHead>Dagen</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.loanCarsInUse.map((item: any) => (
                  <TableRow key={item.claimId}>
                    <TableCell className="font-medium">{item.car.brand} {item.car.model}</TableCell>
                    <TableCell>{item.car.license_number}</TableCell>
                    <TableCell>{item.customer}</TableCell>
                    <TableCell className="text-muted-foreground">{item.description}</TableCell>
                    <TableCell><Badge variant="outline">{item.days}d</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => handleUnlinkCar(item.claimId)}>
                        <Unlink className="h-3 w-3" /> Loskoppelen
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Garantie Email Inbox */}
      <GarantieEmailInbox />

      {/* Geheugen */}
      <AgentMemoryTab agentName="Sara" />
    </div>
  );
};
