
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Eye } from "lucide-react";
import { generateContract } from "@/services/contractService";
import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";

const ContractPreview = () => {
  const [contractHtml, setContractHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [contractType, setContractType] = useState<"b2b" | "b2c">("b2b");

  // Test vehicle data
  const testVehicle: Vehicle = {
    id: "preview-test",
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
    notes: "Test voertuig voor contract preview.",
    mainPhotoUrl: "https://placehold.co/600x400?text=Mercedes+C+Class",
    photos: ["https://placehold.co/600x400?text=Mercedes+C+Class"],
    customerId: "test-customer",
    customerName: "ABC Auto Dealership",
    customerContact: {
      name: "Jan van der Berg",
      email: "jan@abcauto.nl"
    }
  };

  const contractOptions: ContractOptions = {
    btwType: "exclusive",
    bpmIncluded: false,
    vehicleType: "btw",
    maxDamageAmount: 1000,
    deliveryPackage: "standard",
    paymentTerms: "immediate",
    additionalClauses: "Voertuig wordt geleverd inclusief alle originele papieren en sleutels.",
    specialAgreements: "Aflevering binnen 5 werkdagen na ondertekening contract."
  };

  const loadContract = async () => {
    setLoading(true);
    try {
      const contract = await generateContract(testVehicle, contractType, contractOptions);
      setContractHtml(contract.htmlContent);
    } catch (error) {
      console.error("Error generating contract:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContract();
  }, [contractType]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Contract Preview</h1>
          <p className="text-muted-foreground">
            Bekijk hoe het koopcontract eruit ziet
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contract Instellingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm font-medium">Contract Type:</label>
                <Select value={contractType} onValueChange={(value: "b2b" | "b2c") => setContractType(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="b2b">Zakelijk (B2B)</SelectItem>
                    <SelectItem value="b2c">Particulier (B2C)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={loadContract} disabled={loading}>
                <Eye className="h-4 w-4 mr-2" />
                {loading ? "Laden..." : "Ververs Contract"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {contractHtml && (
          <Card>
            <CardHeader>
              <CardTitle>Contract Voorbeeld</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="contract-preview border rounded-lg bg-white p-6 max-h-[800px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: contractHtml }}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
              />
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="text-center">
            <p className="text-lg text-gray-600">Contract laden...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractPreview;
