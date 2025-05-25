
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
import { Mail, Plus, Edit, Trash2, Eye, Save, Copy, Palette, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  name: string;
  category: "transport" | "b2b" | "b2c" | "leverancier";
  subject: string;
  content: string;
  htmlContent: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  fromEmailId: string;
  dashboardButton?: string;
  templateStyle: "basic" | "professional" | "modern" | "corporate";
}

interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  isActive: boolean;
}

export const EmailTemplateManagement = () => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("transport");
  const [viewMode, setViewMode] = useState<"text" | "html">("text");

  // Mock email accounts - in productie zou dit uit EmailSettings komen
  const emailAccounts: EmailAccount[] = [
    { id: "1", email: "verkoper1@autodealerx.nl", provider: "Gmail", isActive: true },
    { id: "2", email: "info@autodealerx.nl", provider: "Outlook", isActive: true },
    { id: "3", email: "transport@autodealerx.nl", provider: "Gmail", isActive: true }
  ];

  // Dashboard knoppen configuratie
  const dashboardButtons = [
    { id: "transport_pickup", label: "Transport Ophalen", category: "transport" },
    { id: "transport_delivery", label: "Transport Afleveren", category: "transport" },
    { id: "b2b_contract", label: "B2B Contract Versturen", category: "b2b" },
    { id: "b2b_reminder", label: "B2B Betalingsherinnering", category: "b2b" },
    { id: "b2c_rdw_update", label: "B2C RDW Update", category: "b2c" },
    { id: "b2c_delivery", label: "B2C Aflevering", category: "b2c" },
    { id: "supplier_payment", label: "Leverancier Betaling", category: "leverancier" },
    { id: "supplier_documents", label: "Leverancier Documenten", category: "leverancier" }
  ];

  // Template stijlen
  const templateStyles = [
    { id: "basic", name: "Basis", description: "Eenvoudige tekst email" },
    { id: "professional", name: "Professioneel", description: "Stijlvolle zakelijke opmaak" },
    { id: "modern", name: "Modern", description: "Moderne layout met kleuren" },
    { id: "corporate", name: "Corporate", description: "Formele bedrijfsopmaak" }
  ];

  // HTML sjablonen
  const getHtmlTemplate = (style: string, content: string, subject: string) => {
    const baseStyles = {
      basic: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">${subject}</h2>
          <div style="line-height: 1.6; color: #444;">
            ${content.replace(/\n/g, '<br>')}
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Dit is een geautomatiseerde email van AutoDealerX</p>
        </div>
      `,
      professional: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 0;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">AutoDealerX</h1>
          </div>
          <div style="background: white; padding: 40px; margin: 0;">
            <h2 style="color: #333; margin-bottom: 20px;">${subject}</h2>
            <div style="line-height: 1.8; color: #555; font-size: 16px;">
              ${content.replace(/\n/g, '<br>')}
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; margin: 0; font-size: 14px;">Met vriendelijke groet,<br>Het AutoDealerX Team</p>
          </div>
        </div>
      `,
      modern: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #1f2937; padding: 25px;">
            <h1 style="color: #f59e0b; margin: 0; font-size: 26px; font-weight: 700;">AutoDealerX</h1>
          </div>
          <div style="padding: 40px 30px;">
            <div style="border-left: 4px solid #f59e0b; padding-left: 20px; margin-bottom: 30px;">
              <h2 style="color: #1f2937; margin: 0; font-size: 20px;">${subject}</h2>
            </div>
            <div style="line-height: 1.7; color: #374151; font-size: 15px;">
              ${content.replace(/\n/g, '<br>')}
            </div>
            <div style="margin-top: 40px; padding: 20px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">
                Voor vragen kunt u contact opnemen via info@autodealerx.nl
              </p>
            </div>
          </div>
        </div>
      `,
      corporate: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 2px solid #2c3e50;">
          <div style="background: #2c3e50; color: white; padding: 25px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">AUTODEALERX</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Uw Partner in Automotive</p>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; margin-bottom: 25px;">${subject}</h2>
            <div style="line-height: 1.8; color: #2c3e50; font-size: 15px; text-align: justify;">
              ${content.replace(/\n/g, '<br>')}
            </div>
            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #bdc3c7; padding-top: 20px;">
              <p style="color: #7f8c8d; margin: 0; font-size: 12px; font-style: italic;">
                Dit document is vertrouwelijk en bedoeld voor de geadresseerde.
              </p>
            </div>
          </div>
        </div>
      `
    };
    return baseStyles[style as keyof typeof baseStyles] || baseStyles.basic;
  };

  // Mock data met uitgebreide templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([
    {
      id: "1",
      name: "Transport Pickup Herinnering",
      category: "transport",
      subject: "Voertuig ophalen - {{voertuig.kenteken}}",
      content: "Beste {{transporteur.naam}},\n\nHierbij de herinnering voor het ophalen van voertuig {{voertuig.merk}} {{voertuig.model}} met kenteken {{voertuig.kenteken}}.\n\nAdres: {{ophaaladres}}\nDatum: {{ophaaldatum}}\nTijd: {{ophaaltijd}}\n\nMet vriendelijke groet,\n{{bedrijf.naam}}",
      htmlContent: "",
      variables: ["voertuig.kenteken", "voertuig.merk", "voertuig.model", "transporteur.naam", "ophaaladres", "ophaaldatum", "ophaaltijd", "bedrijf.naam"],
      isActive: true,
      createdAt: "2024-01-15",
      fromEmailId: "3",
      dashboardButton: "transport_pickup",
      templateStyle: "professional"
    },
    {
      id: "2", 
      name: "B2B Contract Versturen",
      category: "b2b",
      subject: "Contract voor {{voertuig.merk}} {{voertuig.model}}",
      content: "Beste {{klant.naam}},\n\nIn de bijlage treft u het contract aan voor de aanschaf van {{voertuig.merk}} {{voertuig.model}} met kenteken {{voertuig.kenteken}}.\n\nVerkoopprijs: {{voertuig.verkoopprijs}}\nVerkoper: {{verkoper.naam}}\n\nGraag het getekende contract retourneren.\n\nMet vriendelijke groet,\n{{verkoper.naam}}\n{{bedrijf.naam}}",
      htmlContent: "",
      variables: ["klant.naam", "voertuig.merk", "voertuig.model", "voertuig.kenteken", "voertuig.verkoopprijs", "verkoper.naam", "bedrijf.naam"],
      isActive: true,
      createdAt: "2024-01-16",
      fromEmailId: "1",
      dashboardButton: "b2b_contract",
      templateStyle: "corporate"
    },
    {
      id: "3",
      name: "B2C RDW Update",
      category: "b2c", 
      subject: "Update registratie {{voertuig.kenteken}}",
      content: "Beste {{klant.naam}},\n\nWe hebben goed nieuws! De registratie van uw {{voertuig.merk}} {{voertuig.model}} bij de RDW is voltooid.\n\nKenteken: {{voertuig.kenteken}}\nStatus: {{voertuig.rdw_status}}\n\nU kunt nu gebruikmaken van uw voertuig.\n\nMet vriendelijke groet,\n{{verkoper.naam}}\n{{bedrijf.naam}}",
      htmlContent: "",
      variables: ["klant.naam", "voertuig.merk", "voertuig.model", "voertuig.kenteken", "voertuig.rdw_status", "verkoper.naam", "bedrijf.naam"],
      isActive: true,
      createdAt: "2024-01-17",
      fromEmailId: "2",
      dashboardButton: "b2c_rdw_update",
      templateStyle: "modern"
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
      // Update HTML content based on style and content
      const updatedTemplate = {
        ...selectedTemplate,
        htmlContent: getHtmlTemplate(selectedTemplate.templateStyle, selectedTemplate.content, selectedTemplate.subject)
      };
      
      setTemplates(prev => 
        prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t)
      );
      setSelectedTemplate(updatedTemplate);
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
      htmlContent: "",
      variables: [],
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      fromEmailId: emailAccounts.find(acc => acc.isActive)?.id || "",
      templateStyle: "basic"
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

  const getEmailAccountName = (emailId: string) => {
    return emailAccounts.find(acc => acc.id === emailId)?.email || "Onbekend";
  };

  const getDashboardButtonName = (buttonId?: string) => {
    return dashboardButtons.find(btn => btn.id === buttonId)?.label || "Niet gekoppeld";
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
            Beheer alle email templates met professionele sjablonen voor transport, klanten en leveranciers
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
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{template.name}</span>
                            <Badge className={getCategoryBadgeColor(template.category)}>
                              {getCategoryName(template.category)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {template.subject}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-400">
                              Van: {getEmailAccountName(template.fromEmailId)}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400">
                              Knop: {getDashboardButtonName(template.dashboardButton)}
                            </span>
                          </div>
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
                          onClick={() => setViewMode(viewMode === "text" ? "html" : "text")}
                        >
                          {viewMode === "text" ? <Eye className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                          {viewMode === "text" ? "HTML" : "Tekst"}
                        </Button>
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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fromEmail">Verzenden vanaf</Label>
                          <Select
                            value={selectedTemplate.fromEmailId}
                            onValueChange={(value) =>
                              setSelectedTemplate({
                                ...selectedTemplate,
                                fromEmailId: value
                              })
                            }
                            disabled={!isEditing}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer email account" />
                            </SelectTrigger>
                            <SelectContent>
                              {emailAccounts.filter(acc => acc.isActive).map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.email} ({account.provider})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dashboardButton">Dashboard Knop</Label>
                          <Select
                            value={selectedTemplate.dashboardButton || "none"}
                            onValueChange={(value) =>
                              setSelectedTemplate({
                                ...selectedTemplate,
                                dashboardButton: value === "none" ? undefined : value
                              })
                            }
                            disabled={!isEditing}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer knop" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Geen koppeling</SelectItem>
                              {dashboardButtons
                                .filter(btn => btn.category === selectedTemplate.category)
                                .map((button) => (
                                <SelectItem key={button.id} value={button.id}>
                                  {button.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="templateStyle">Template Stijl</Label>
                        <Select
                          value={selectedTemplate.templateStyle}
                          onValueChange={(value) =>
                            setSelectedTemplate({
                              ...selectedTemplate,
                              templateStyle: value as EmailTemplate["templateStyle"]
                            })
                          }
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {templateStyles.map((style) => (
                              <SelectItem key={style.id} value={style.id}>
                                <div>
                                  <div className="font-medium">{style.name}</div>
                                  <div className="text-sm text-gray-500">{style.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

                      {viewMode === "text" ? (
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
                      ) : (
                        <div className="space-y-2">
                          <Label>HTML Preview</Label>
                          <div 
                            className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto"
                            dangerouslySetInnerHTML={{
                              __html: getHtmlTemplate(selectedTemplate.templateStyle, selectedTemplate.content, selectedTemplate.subject)
                            }}
                          />
                        </div>
                      )}

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
