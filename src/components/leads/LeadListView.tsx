import React, { useState } from "react";
import { Lead, LeadStatus } from "@/types/leads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowUpDown, MoreVertical, UserPlus, Tag, Archive } from "lucide-react";
import { parseLeadData } from "@/utils/leadParser";

interface LeadListViewProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  salespeople: Array<{ id: string; name: string }>;
}

type SortField = 'name' | 'status' | 'source' | 'createdAt' | 'assignedTo';
type SortDirection = 'asc' | 'desc';

export const LeadListView: React.FC<LeadListViewProps> = ({
  leads,
  onLeadClick,
  salespeople
}) => {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case 'name':
        const aParsed = parseLeadData(a);
        const bParsed = parseLeadData(b);
        aValue = aParsed.customerName.toLowerCase();
        bValue = bParsed.customerName.toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'source':
        aValue = a.source;
        bValue = b.source;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'assignedTo':
        aValue = a.assignedTo || '';
        bValue = b.assignedTo || '';
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleLeadSelection = (leadId: string) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId);
    } else {
      newSelection.add(leadId);
    }
    setSelectedLeads(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)));
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'new': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'contacted': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'qualified': return 'bg-purple-500/10 text-purple-700 border-purple-200';
      case 'proposal': return 'bg-orange-500/10 text-orange-700 border-orange-200';
      case 'negotiation': return 'bg-indigo-500/10 text-indigo-700 border-indigo-200';
      case 'won': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'lost': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: LeadStatus) => {
    const labels: Record<LeadStatus, string> = {
      new: 'Nieuw',
      contacted: 'Gecontacteerd',
      qualified: 'Gekwalificeerd',
      proposal: 'Offerte',
      negotiation: 'Onderhandeling',
      won: 'Gewonnen',
      lost: 'Verloren'
    };
    return labels[status];
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      website: 'Website',
      facebook: 'Facebook',
      autotrack: 'AutoTrack',
      marktplaats: 'Marktplaats',
      referral: 'Doorverwijzing',
      phone: 'Telefoon',
      other: 'Overig'
    };
    return labels[source] || source;
  };

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedLeads.size > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} geselecteerd
            </span>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Wijs toe aan...
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {salespeople.map((person) => (
                    <DropdownMenuItem key={person.id}>
                      {person.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Tag className="h-4 w-4" />
                    Wijzig status...
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Gecontacteerd</DropdownMenuItem>
                  <DropdownMenuItem>Gekwalificeerd</DropdownMenuItem>
                  <DropdownMenuItem>Offerte</DropdownMenuItem>
                  <DropdownMenuItem>Onderhandeling</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="sm" className="gap-2">
                <Archive className="h-4 w-4" />
                Archiveer
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedLeads.size === leads.length && leads.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <SortButton field="name">Lead Naam</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="status">Status</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="source">Bron</SortButton>
              </TableHead>
              <TableHead>Voertuig</TableHead>
              <TableHead>
                <SortButton field="assignedTo">Eigenaar</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="createdAt">Laatste Activiteit</SortButton>
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLeads.map((lead) => {
              const parsedData = parseLeadData(lead);
              const salesperson = salespeople.find(s => s.id === lead.assignedTo);
              
              return (
                <TableRow 
                  key={lead.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onLeadClick(lead)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={() => toggleLeadSelection(lead.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{parsedData.customerName}</div>
                      <div className="text-sm text-muted-foreground">{parsedData.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(lead.status)}>
                      {getStatusLabel(lead.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getSourceLabel(lead.source)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {parsedData.vehicleInterest || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {salesperson ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {salesperson.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm">{salesperson.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Niet toegewezen</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(lead.createdAt), 'dd MMM yyyy', { locale: nl })}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onLeadClick(lead)}>
                          Details bekijken
                        </DropdownMenuItem>
                        <DropdownMenuItem>Email versturen</DropdownMenuItem>
                        <DropdownMenuItem>Status wijzigen</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Archiveren
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
