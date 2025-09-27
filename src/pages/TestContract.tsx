
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, ExternalLink, Copy } from "lucide-react";
import { createSignatureSession, generateSignatureUrl } from "@/services/digitalSignatureService";
import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";

const TestContract = () => {
  const { toast } = useToast();
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  
  // Test vehicle data for ABC Auto Dealership
  const testVehicle: Vehicle = {
    id: "test-4",
    brand: "Mercedes",
    model: "C Class",
    color: "Zwart Metallic",
    licenseNumber: "EF-012-G",
    vin: "WDD2052011F123456",
    mileage: 70000,
    year: 2019,
    importStatus: "ingeschreven",
    transportStatus: "aangekomen",
    arrived: true,
    workshopStatus: "gereed",
    location: "showroom",
    salesStatus: "verkocht_b2b",
    showroomOnline: false,
    bpmRequested: true,
    bpmStarted: true,
    damage: {
      description: "No damage",
      status: "geen",
    },
    purchasePrice: 24000,
    sellingPrice: 27000,
    paymentStatus: "niet_betaald",
    cmrSent: true,
    cmrDate: new Date("2023-02-20"),
    papersReceived: true,
    papersDate: new Date("2023-02-25"),
    notes: "Sold to ABC Auto Dealership.",
    mainPhotoUrl: "https://placehold.co/600x400?text=Mercedes+C+Class",
    photos: ["https://placehold.co/600x400?text=Mercedes+C+Class"],
    customerId: "dealer-1",
    customerName: "ABC Auto Dealership",
    customerContact: {
      name: "Jan van der Berg",
      email: "jan@abcauto.nl"
    }
  };

  const [contractType, setContractType] = useState<"b2b" | "b2c">("b2b");
  const [contractOptions, setContractOptions] = useState<ContractOptions>({
    btwType: "exclusive",
    bpmIncluded: false,
    vehicleType: "btw",
    maxDamageAmount: 1000,
    deliveryPackage: "standard",
    paymentTerms: "immediate",
    additionalClauses: "Voertuig wordt geleverd inclusief alle originele papieren en sleutels.",
    specialAgreements: "Aflevering binnen 5 werkdagen na ondertekening contract."
  });

  const generateTestSignatureLink = async () => {
    setLoading(true);
    try {
      // Create signature session
      const session = await createSignatureSession(testVehicle, contractType, contractOptions);
      const url = generateSignatureUrl(session);
      
      setSignatureUrl(url);
      
      toast({
        title: "Ondertekeningslink gegenereerd",
        description: "Je kunt nu de klantbeleving testen door op de link te klikken",
      });
    } catch (error) {
      console.error("Error generating signature link:", error);
      toast({
        title: "Fout",
        description: "Kon ondertekeningslink niet genereren",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Gekopieerd",
        description: "Link is gekopieerd naar het klembord",
      });
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Contract Test Omgeving</h1>
          <p className="text-muted-foreground">
            Test de volledige klantbeleving voor digitale contractondertekening
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Test Vehicle Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Test Voertuig: ABC Auto Dealership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Voertuig:</span> {testVehicle.brand} {testVehicle.model}
                </div>
                <div>
                  <span className="font-medium">Kleur:</span> {testVehicle.color}
                </div>
                <div>
                  <span className="font-medium">Kenteken:</span> {testVehicle.licenseNumber}
                </div>
                <div>
                  <span className="font-medium">Kilometerstand:</span> {testVehicle.mileage?.toLocaleString()} km
                </div>
                <div>
                  <span className="font-medium">Bouwjaar:</span> {testVehicle.year}
                </div>
                <div>
                  <span className="font-medium">Prijs:</span> €{testVehicle.sellingPrice?.toLocaleString()}
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Klant:</h4>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">Bedrijf:</span> {testVehicle.customerName}</div>
                  <div><span className="font-medium">Contactpersoon:</span> {testVehicle.customerContact?.name}</div>
                  <div><span className="font-medium">Email:</span> {testVehicle.customerContact?.email}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Configuratie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Contract Type</Label>
                <Select value={contractType} onValueChange={(value: "b2b" | "b2c") => setContractType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="b2b">Zakelijk (B2B)</SelectItem>
                    <SelectItem value="b2c">Particulier (B2C)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {contractType === "b2b" && (
                <>
                  <div>
                    <Label>BTW Behandeling</Label>
                    <Select 
                      value={contractOptions.btwType} 
                      onValueChange={(value: "inclusive" | "exclusive") => 
                        setContractOptions(prev => ({ ...prev, btwType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inclusive">Inclusief BTW</SelectItem>
                        <SelectItem value="exclusive">Exclusief BTW</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Max Schade Bedrag (€)</Label>
                    <Input
                      type="number"
                      value={contractOptions.maxDamageAmount}
                      onChange={(e) => 
                        setContractOptions(prev => ({ ...prev, maxDamageAmount: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>
                </>
              )}

              <Button 
                onClick={generateTestSignatureLink} 
                disabled={loading}
                className="w-full"
              >
                {loading ? "Genereren..." : "Genereer Ondertekeningslink"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Generated Link */}
        {signatureUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Ondertekeningslink Gegenereerd</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Label>Ondertekeningslink:</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(signatureUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <code className="text-sm bg-background p-2 rounded border block overflow-x-auto">
                  {signatureUrl}
                </code>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => window.open(signatureUrl, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test Klantbeleving
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => copyToClipboard(signatureUrl)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Kopieer Link
                </Button>
              </div>

              <div className="text-sm text-muted-foreground p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">Hoe te testen:</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Klik op "Test Klantbeleving" om het contract te bekijken zoals de klant het ziet</li>
                  <li>Vul de naam en email in (mag test data zijn)</li>
                  <li>Teken een handtekening in het vak</li>
                  <li>Klik op "Contract Ondertekenen"</li>
                  <li>Bekijk de bevestiging en test de volledige flow</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TestContract;
