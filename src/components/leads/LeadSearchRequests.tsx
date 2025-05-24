
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { LeadSearchRequest } from "@/types/leads";
import { getSearchRequests, getSearchRequestStats, createSearchRequest } from "@/services/leadService";
import { Plus, Search, Car, Calendar, User, Phone, Mail, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export const LeadSearchRequests: React.FC = () => {
  const [searchRequests] = useState<LeadSearchRequest[]>(getSearchRequests());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    leadName: '',
    leadEmail: '',
    leadPhone: '',
    requestedBrand: '',
    requestedModel: '',
    requestedYear: '',
    requestedFuelType: '',
    requestedTransmission: '',
    minPrice: '',
    maxPrice: '',
    maxKilometers: '',
    priority: 'medium' as const,
    expiryDate: '',
    notes: '',
    assignedTo: '',
    notifyWhenAvailable: true
  });
  
  const { toast } = useToast();
  const stats = getSearchRequestStats();

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

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return expiry <= oneWeekFromNow;
  };

  const filteredRequests = searchRequests.filter(request => {
    const matchesSearch = `${request.leadName} ${request.requestedBrand} ${request.requestedModel} ${request.leadEmail}`
      .toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesAssignee = assigneeFilter === "all" || request.assignedTo === assigneeFilter;
    return matchesSearch && matchesStatus && matchesAssignee;
  });

  const handleCreateRequest = () => {
    if (!newRequest.leadName || !newRequest.requestedBrand || !newRequest.requestedModel) {
      toast({
        title: "Fout",
        description: "Naam, merk en model zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    // In real app, this would use the lead ID from a lead selector
    const leadId = "lead1"; // Mock lead ID

    createSearchRequest({
      leadId,
      leadName: newRequest.leadName,
      leadEmail: newRequest.leadEmail,
      leadPhone: newRequest.leadPhone,
      requestedBrand: newRequest.requestedBrand,
      requestedModel: newRequest.requestedModel,
      requestedYear: newRequest.requestedYear || undefined,
      requestedFuelType: newRequest.requestedFuelType || undefined,
      requestedTransmission: newRequest.requestedTransmission || undefined,
      minPrice: newRequest.minPrice ? parseInt(newRequest.minPrice) : undefined,
      maxPrice: newRequest.maxPrice ? parseInt(newRequest.maxPrice) : undefined,
      maxKilometers: newRequest.maxKilometers ? parseInt(newRequest.maxKilometers) : undefined,
      status: 'active',
      priority: newRequest.priority,
      requestDate: new Date().toISOString(),
      expiryDate: newRequest.expiryDate || undefined,
      notes: newRequest.notes,
      assignedTo: newRequest.assignedTo || "Admin",
      createdBy: "Admin",
      notifyWhenAvailable: newRequest.notifyWhenAvailable
    });

    toast({
      title: "Zoekopdracht toegevoegd",
      description: "De nieuwe zoekopdracht is succesvol aangemaakt.",
    });

    setNewRequest({
      leadName: '',
      leadEmail: '',
      leadPhone: '',
      requestedBrand: '',
      requestedModel: '',
      requestedYear: '',
      requestedFuelType: '',
      requestedTransmission: '',
      minPrice: '',
      maxPrice: '',
      maxKilometers: '',
      priority: 'medium',
      expiryDate: '',
      notes: '',
      assignedTo: '',
      notifyWhenAvailable: true
    });
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actieve Zoekopdrachten</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeRequests}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vervulde Opdrachten</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.byStatus.fulfilled || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vervallen Binnenkort</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal Zoekopdrachten</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Zoekopdrachten</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuwe Zoekopdracht
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nieuwe Zoekopdracht</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Klant Naam*</label>
                  <Input 
                    value={newRequest.leadName}
                    onChange={(e) => setNewRequest({...newRequest, leadName: e.target.value})}
                    placeholder="Naam van de klant"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    value={newRequest.leadEmail}
                    onChange={(e) => setNewRequest({...newRequest, leadEmail: e.target.value})}
                    placeholder="Email adres"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Telefoon</label>
                  <Input 
                    value={newRequest.leadPhone}
                    onChange={(e) => setNewRequest({...newRequest, leadPhone: e.target.value})}
                    placeholder="Telefoonnummer"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Prioriteit</label>
                  <Select value={newRequest.priority} onValueChange={(value: any) => setNewRequest({...newRequest, priority: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Laag</SelectItem>
                      <SelectItem value="medium">Gemiddeld</SelectItem>
                      <SelectItem value="high">Hoog</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Merk*</label>
                  <Input 
                    value={newRequest.requestedBrand}
                    onChange={(e) => setNewRequest({...newRequest, requestedBrand: e.target.value})}
                    placeholder="Auto merk"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Model*</label>
                  <Input 
                    value={newRequest.requestedModel}
                    onChange={(e) => setNewRequest({...newRequest, requestedModel: e.target.value})}
                    placeholder="Auto model"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Jaar</label>
                  <Input 
                    value={newRequest.requestedYear}
                    onChange={(e) => setNewRequest({...newRequest, requestedYear: e.target.value})}
                    placeholder="Bouwjaar"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Brandstof</label>
                  <Select value={newRequest.requestedFuelType} onValueChange={(value) => setNewRequest({...newRequest, requestedFuelType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer brandstof" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Benzine">Benzine</SelectItem>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="Elektrisch">Elektrisch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Transmissie</label>
                  <Select value={newRequest.requestedTransmission} onValueChange={(value) => setNewRequest({...newRequest, requestedTransmission: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer transmissie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Handgeschakeld">Handgeschakeld</SelectItem>
                      <SelectItem value="Automaat">Automaat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Min. Prijs (€)</label>
                  <Input 
                    type="number"
                    value={newRequest.minPrice}
                    onChange={(e) => setNewRequest({...newRequest, minPrice: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max. Prijs (€)</label>
                  <Input 
                    type="number"
                    value={newRequest.maxPrice}
                    onChange={(e) => setNewRequest({...newRequest, maxPrice: e.target.value})}
                    placeholder="100000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max. Kilometers</label>
                  <Input 
                    type="number"
                    value={newRequest.maxKilometers}
                    onChange={(e) => setNewRequest({...newRequest, maxKilometers: e.target.value})}
                    placeholder="100000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Toegewezen aan</label>
                  <Select value={newRequest.assignedTo} onValueChange={(value) => setNewRequest({...newRequest, assignedTo: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer verkoper" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pieter Jansen">Pieter Jansen</SelectItem>
                      <SelectItem value="Sander Vermeulen">Sander Vermeulen</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Vervaldatum</label>
                  <Input 
                    type="date"
                    value={newRequest.expiryDate}
                    onChange={(e) => setNewRequest({...newRequest, expiryDate: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notities</label>
                <Textarea 
                  value={newRequest.notes}
                  onChange={(e) => setNewRequest({...newRequest, notes: e.target.value})}
                  placeholder="Extra informatie over de zoekopdracht..."
                  className="min-h-[80px]"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleCreateRequest}>
                  Zoekopdracht Aanmaken
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Zoek zoekopdrachten..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter op status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            <SelectItem value="active">Actief</SelectItem>
            <SelectItem value="fulfilled">Vervuld</SelectItem>
            <SelectItem value="expired">Verlopen</SelectItem>
            <SelectItem value="cancelled">Geannuleerd</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter op verkoper" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle verkopers</SelectItem>
            <SelectItem value="Pieter Jansen">Pieter Jansen</SelectItem>
            <SelectItem value="Sander Vermeulen">Sander Vermeulen</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Geen zoekopdrachten gevonden
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-lg">{request.leadName}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusLabel(request.status)}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(request.priority)}>
                        {request.priority}
                      </Badge>
                      {isExpiringSoon(request.expiryDate) && request.status === 'active' && (
                        <Badge className="bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Vervalt binnenkort
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="flex items-center gap-1 mb-1">
                          <User className="h-3 w-3" />
                          <strong>Contact:</strong>
                        </p>
                        {request.leadEmail && (
                          <p className="flex items-center gap-1 text-muted-foreground ml-4">
                            <Mail className="h-3 w-3" />
                            {request.leadEmail}
                          </p>
                        )}
                        {request.leadPhone && (
                          <p className="flex items-center gap-1 text-muted-foreground ml-4">
                            <Phone className="h-3 w-3" />
                            {request.leadPhone}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <p className="flex items-center gap-1 mb-1">
                          <Car className="h-3 w-3" />
                          <strong>Gezocht voertuig:</strong>
                        </p>
                        <p className="text-muted-foreground ml-4">
                          {request.requestedBrand} {request.requestedModel}
                          {request.requestedYear && ` (${request.requestedYear})`}
                        </p>
                        {request.requestedFuelType && (
                          <p className="text-muted-foreground ml-4">{request.requestedFuelType}</p>
                        )}
                        {(request.minPrice || request.maxPrice) && (
                          <p className="text-muted-foreground ml-4">
                            Budget: €{request.minPrice?.toLocaleString() || 0} - €{request.maxPrice?.toLocaleString() || 'onbeperkt'}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <p className="flex items-center gap-1 mb-1">
                          <Calendar className="h-3 w-3" />
                          <strong>Datum info:</strong>
                        </p>
                        <p className="text-muted-foreground ml-4">
                          Aangemaakt: {format(new Date(request.requestDate), 'dd/MM/yyyy')}
                        </p>
                        {request.expiryDate && (
                          <p className="text-muted-foreground ml-4">
                            Vervalt: {format(new Date(request.expiryDate), 'dd/MM/yyyy')}
                          </p>
                        )}
                        <p className="text-muted-foreground ml-4">
                          Toegewezen: {request.assignedTo}
                        </p>
                      </div>
                    </div>
                    
                    {request.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="text-sm"><strong>Notities:</strong> {request.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
