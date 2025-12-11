import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wrench, Car, DollarSign, TrendingUp, User } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { damageRepairReportsService } from "@/services/damageRepairReportsService";
import { format, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const DamageRepairAnalytics: React.FC = () => {
  const [periodType, setPeriodType] = useState<"week" | "month" | "year">("month");

  const period = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let label: string;

    switch (periodType) {
      case "week":
        startDate = subDays(now, 7);
        label = "Deze Week";
        break;
      case "month":
        startDate = subDays(now, 30);
        label = "Deze Maand";
        break;
      case "year":
        startDate = subDays(now, 365);
        label = "Dit Jaar";
        break;
    }

    return { 
      startDate: startDate.toISOString(), 
      endDate: now.toISOString(), 
      label,
      type: periodType 
    };
  }, [periodType]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['damage-repair-stats', periodType],
    queryFn: () => damageRepairReportsService.getDamageRepairStats(period),
    refetchOnMount: true
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Wrench className="h-6 w-6 animate-pulse" />
          <span>Laden schadeherstel data...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Geen data beschikbaar
      </div>
    );
  }

  // Prepare chart data
  const employeeChartData = stats.byEmployee.map(emp => ({
    name: emp.employeeName.split(' ')[0], // First name only for chart
    omzet: emp.totalRevenue,
    onderdelen: emp.totalParts
  }));

  const partChartData = stats.byPart.slice(0, 6).map(part => ({
    name: part.partName,
    value: part.count
  }));

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Schadeherstel Dashboard</h2>
        <Select value={periodType} onValueChange={(v: "week" | "month" | "year") => setPeriodType(v)}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Selecteer periode" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="week">Deze Week</SelectItem>
            <SelectItem value="month">Deze Maand</SelectItem>
            <SelectItem value="year">Dit Jaar</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Omzet</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{stats.totalRevenue.toLocaleString('nl-NL')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {period.label}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Onderdelen Hersteld</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalParts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              €300 per onderdeel
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voertuigen</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalVehicles}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalTasks} taken voltooid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gem. per Voertuig</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{stats.averagePerVehicle.toLocaleString('nl-NL')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              gemiddelde kosten
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Omzet per Medewerker
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employeeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={employeeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `€${v.toLocaleString()}`} />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip 
                    formatter={(value: number) => [`€${value.toLocaleString()}`, 'Omzet']}
                    labelFormatter={(label) => `Medewerker: ${label}`}
                  />
                  <Bar dataKey="omzet" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Geen data beschikbaar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Parts Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Meest Herstelde Onderdelen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {partChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={partChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {partChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Geen data beschikbaar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Schadeherstel Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.repairHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Merk</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Chassisnummer</TableHead>
                    <TableHead>Gespoten Delen</TableHead>
                    <TableHead className="text-right">Kosten</TableHead>
                    <TableHead>Medewerker</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.repairHistory.map((record) => (
                    <TableRow key={record.taskId}>
                      <TableCell>
                        {format(new Date(record.completedAt), 'dd-MM-yyyy', { locale: nl })}
                      </TableCell>
                      <TableCell className="font-medium">{record.vehicleBrand}</TableCell>
                      <TableCell>{record.vehicleModel}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {record.vehicleVin !== '-' ? record.vehicleVin.slice(0, 10) + '...' : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {record.repairedParts.length > 0 ? (
                            record.repairedParts.map((part, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {part}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        €{record.repairCost.toLocaleString('nl-NL')}
                      </TableCell>
                      <TableCell>{record.employeeName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Geen voltooide schadeherstel taken in deze periode
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Summary Table */}
      {stats.byEmployee.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Medewerker Prestaties</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medewerker</TableHead>
                  <TableHead className="text-right">Taken</TableHead>
                  <TableHead className="text-right">Onderdelen</TableHead>
                  <TableHead className="text-right">Omzet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.byEmployee.map((emp) => (
                  <TableRow key={emp.employeeId}>
                    <TableCell className="font-medium">{emp.employeeName}</TableCell>
                    <TableCell className="text-right">{emp.totalTasks}</TableCell>
                    <TableCell className="text-right">{emp.totalParts}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      €{emp.totalRevenue.toLocaleString('nl-NL')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
