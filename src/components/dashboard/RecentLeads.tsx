
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Sample data - in a real app would come from API
const recentLeads = [
  {
    id: "LD-1234",
    name: "Jan Jansen",
    type: "B2C",
    status: "Nieuw",
    interest: "Model X 2023",
    date: "2023-05-15",
    priority: "Hoog",
  },
  {
    id: "LD-1235",
    name: "Autobedrijf Smit",
    type: "B2B",
    status: "Gecontacteerd",
    interest: "3x Model Y Premium",
    date: "2023-05-14",
    priority: "Middel",
  },
  {
    id: "LD-1236",
    name: "Marie de Vries",
    type: "B2C",
    status: "Onderhandeling",
    interest: "Model Z Standard",
    date: "2023-05-12",
    priority: "Laag",
  },
  {
    id: "LD-1237",
    name: "Groothandel Auto B.V.",
    type: "B2B",
    status: "Gecontacteerd",
    interest: "5x Model X Base",
    date: "2023-05-10",
    priority: "Hoog",
  },
];

const StatusBadge = ({ status }: { status: string }) => {
  let color;
  switch (status) {
    case "Nieuw":
      color = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      break;
    case "Gecontacteerd":
      color = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      break;
    case "Onderhandeling":
      color = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      break;
    case "Gewonnen":
      color = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      break;
    case "Verloren":
      color = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      break;
    default:
      color = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }

  return <span className={cn("px-2 py-1 rounded-full text-xs font-medium", color)}>{status}</span>;
};

const RecentLeads = () => {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Recente Leads</CardTitle>
        <CardDescription>Meest recente leads in het systeem</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Naam</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Interesse</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Prioriteit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentLeads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.id}</TableCell>
                <TableCell>{lead.name}</TableCell>
                <TableCell>{lead.type}</TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell>{lead.interest}</TableCell>
                <TableCell>{new Date(lead.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      lead.priority === "Hoog"
                        ? "destructive"
                        : lead.priority === "Middel"
                        ? "default"
                        : "outline"
                    }
                  >
                    {lead.priority}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RecentLeads;
