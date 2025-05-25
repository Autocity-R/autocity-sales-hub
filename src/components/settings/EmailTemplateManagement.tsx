import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Mail, Plus, Edit, Trash2, Eye, Save, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  name: string;
  category: "transport" | "b2b" | "b2c" | "leverancier";
  subject: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
}

export const EmailTemplateManagement = () => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("transport");

  // Mock data - in productie zou dit uit een API komen
  const [templates, setTemplates] = useState<EmailTemplate[]>([
    {
      id: "1",
      name: "Transport Pickup Herinnering",
      category: "transport",
      subject: "Voertuig ophalen - {{voertuig.kenteken}}",
      content: "Beste {{transporteur.naam}},\n\nHierbij de herinnering voor het ophalen van voertuig {{voertuig.merk}} {{voertuig.model}} met kenteken {{voertuig.kenteken}}.\n\nAdres: {{ophaaladres}}\nDatum: {{ophaaldatum}}\nTijd: {{ophaaltijd}}\n\nMet vriendelijke groet,\n{{bedrijf.naam}}",
      variables: ["voertuig.kenteken", "voertuig.merk", "voertuig.model", "transporteur.naam", "ophaaladres", "ophaaldatum", "ophaaltijd", "bedrijf.naam"],
      isActive: true,
      createdAt: "2024-01-15"
    },
    {
      id: "2", 
      name: "B2B Contract Versturen",
      category: "b2b",
      subject: "Contract voor {{voertuig.merk}} {{voertuig.model}}",
      content: "Beste {{klant.naam}},\n\nIn de bijlage treft u het contract aan voor de aanschaf van {{voertuig.merk}} {{voertuig.model}} met kenteken {{voertuig.kenteken}}.\n\nVerkoopprijs: {{voertuig.verkoopprijs}}\nVerkoper: {{verkoper.naam}}\n\nGraag het getekende contract retourneren.\n\nMet vriendelijke groet,\n{{verkoper.naam}}\n{{bedrijf.naam}}",
      variables: ["klant.naam", "voertuig.merk", "voertuig.model", "voertuig.kenteken", "voertuig.verkoopprijs", "verkoper.naam", "bedrijf.naam"],
      isActive: true,
      createdAt: "2024-01-16"
    },
    {
      id: "3",
      name: "B2C RDW Update",
      category: "b2c", 
      subject: "Update registratie {{voertuig.kenteken}}",
      content: "Beste {{klant.naam}},\n\nWe hebben goed nieuws! De registratie van uw {{voertuig.merk}} {{voertuig.model}} bij de RDW is voltooid.\n\nKenteken: {{voertuig.kenteken}}\nStatus: {{voertuig.rdw_status}}\n\nU kunt nu gebruikmaken van uw voertuig.\n\nMet vriendelijke groet,\n{{verkoper.naam}}\n{{bedrijf.naam}}",
      variables: ["klant.naam", "voertuig.merk", "voertuig.model", "voertuig.kenteken", "voertuig.rdw_status", "verkoper.naam", "bedrijf.naam"],
      isActive: true,
      createdAt: "2024-01-17"
    }
  ]);

  const availableVariables = [
    { category: "Voertuig", variables: ["voertuig.merk", "voertuig.model", "voertuig.kenteken", "voertuig.verkoopprijs", "voertuig.vin"] },
    { category: "Klant", variables: ["klant.naam", "klant.email", "klant.telefoon", "klant.adres"] },
    { category: "Verkoper", variables: ["verkoper.naam", "verkoper.email", "verkoper.telefoon"] },
    { category: "Bedrijf", variables: ["bedrijf.naam", "bedrijf.email", "bedrijf.telefoon", "bedrijf.adres"] },
    { category: "Transport", variables: ["transporteur.naam", "ophaaladres", "ophaaldatum", "ophaaltijd"] },
    { category: "Datum", variables: ["datum.vandaag", "datum.volgende_week"] }
  ];

  const filteredTemplates = templates.filter(template => template.category === activeTab);

  const handleSaveTemplate = () => {
    if (selectedTemplate) {
      setTemplates(prev => 
        prev.map(t => t.id === selectedTemplate.id ? selectedTemplate : t)
      );
      setIsEditing(false);
      toast({
        title: "Template opgeslagen",
        description: "De email template is succesvol bijgewerkt.",
      });
    }
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(null);
    }
    toast({
      title: "Template verwijderd",
      description: "De email template is verwijderd.",
    });
  };

  const handleCreateTemplate = () => {
    const newTemplate: EmailTemplate = {
      id: Date.now().toString(),
      name: "Nieuwe Template",
      category: activeTab as EmailTemplate["category"],
      subject: "",
      content: "",
      variables: [],
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setTemplates(prev => [...prev, newTemplate]);
    setSelectedTemplate(newTemplate);
    setIsEditing(true);
  };

  const insertVariable = (variable: string) => {
    if (selectedTemplate) {
      const newContent = selectedTemplate.content + `{{${variable}}}`;
      setSelectedTemplate({
        ...selectedTemplate,
        content: newContent
      });
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "transport": return "bg-blue-100 text-blue-800";
      case "b2b": return "bg-purple-100 text-purple-800"; 
      case "b2c": return "bg-green-100 text-green-800";
      case "leverancier": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case "transport": return "Transport";
      case "b2b": return "B2B Klanten";
      case "b2c": return "B2C Klanten"; 
      case "leverancier": return "Leveranciers";
      default: return category;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Template Beheer
          </CardTitle>
          <CardDescription>
            Beheer alle email templates voor transport, klanten en leveranciers
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transport">Transport</TabsTrigger>
          <TabsTrigger value="b2b">B2B Klanten</TabsTrigger>
          <TabsTrigger value="b2c">B2C Klanten</TabsTrigger>
          <TabsTrigger value="leverancier">Leveranciers</TabsTrigger>
        </TabsList>

        {["transport", "b2b", "b2c", "leverancier"].map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {getCategoryName(category)} Templates
              </h3>
              <Button onClick={handleCreateTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Template
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Template List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsEditing(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            <Badge className={getCategoryBadgeColor(template.category)}>
                              {getCategoryName(template.category)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {template.subject}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={template.isActive}
                            onCheckedChange={(checked) => {
                              setTemplates(prev =>
                                prev.map(t =>
                                  t.id === template.id ? { ...t, isActive: checked } : t
                                )
                              );
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredTemplates.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Geen templates gevonden voor {getCategoryName(category)}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Template Editor */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {selectedTemplate ? "Template Editor" : "Selecteer een template"}
                    </CardTitle>
                    {selectedTemplate && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(!isEditing)}
                        >
                          {isEditing ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                        </Button>
                        {isEditing && (
                          <Button size="sm" onClick={handleSaveTemplate}>
                            <Save className="h-4 w-4 mr-2" />
                            Opslaan
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedTemplate ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="templateName">Template Naam</Label>
                        <Input
                          id="templateName"
                          value={selectedTemplate.name}
                          onChange={(e) =>
                            setSelectedTemplate({
                              ...selectedTemplate,
                              name: e.target.value
                            })
                          }
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="templateSubject">Onderwerp</Label>
                        <Input
                          id="templateSubject"
                          value={selectedTemplate.subject}
                          onChange={(e) =>
                            setSelectedTemplate({
                              ...selectedTemplate,
                              subject: e.target.value
                            })
                          }
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="templateContent">Email Inhoud</Label>
                        <Textarea
                          id="templateContent"
                          value={selectedTemplate.content}
                          onChange={(e) =>
                            setSelectedTemplate({
                              ...selectedTemplate,
                              content: e.target.value
                            })
                          }
                          disabled={!isEditing}
                          rows={12}
                          className="font-mono text-sm"
                        />
                      </div>

                      {isEditing && (
                        <div className="space-y-2">
                          <Label>Beschikbare Variabelen</Label>
                          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 border rounded">
                            {availableVariables.map((group) => (
                              <div key={group.category}>
                                <div className="font-medium text-sm text-gray-700 mb-1">
                                  {group.category}
                                </div>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {group.variables.map((variable) => (
                                    <Button
                                      key={variable}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-6"
                                      onClick={() => insertVariable(variable)}
                                    >
                                      {variable}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Selecteer een template om deze te bewerken
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
