import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";
import { FileText, Send, X, Eye, Mail, PenTool, Plus, Trash2, Car } from "lucide-react";
import { generateContract } from "@/services/contractService";
import { createSignatureSession, generateSignatureUrl } from "@/services/digitalSignatureService";
import { useToast } from "@/hooks/use-toast";

interface ContractConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  contractType: "b2b" | "b2c";
  onSendContract: (options: ContractOptions) => void;
}

export const ContractConfigDialog: React.FC<ContractConfigDialogProps> = ({
  isOpen,
  onClose,
  vehicle,
  contractType,
  onSendContract
}) => {
  const { toast } = useToast();
  const [options, setOptions] = useState<ContractOptions>({
    btwType: "inclusive",
    bpmIncluded: false,
    vehicleType: "btw",
    maxDamageAmount: 500,
    deliveryPackage: "garantie_wettelijk",
    paymentTerms: "aanbetaling_5",
    additionalClauses: "",
    specialAgreements: ""
  });
  
  const [deliveryMethod, setDeliveryMethod] = useState<"email" | "digital">("digital");
  const [contractPreview, setContractPreview] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTradeInForm, setShowTradeInForm] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const contract = await generateContract(vehicle, contractType, options);
      setContractPreview(contract);
      setShowPreview(true);
    } catch (error) {
      console.error("Error generating preview:", error);
      toast({
        title: "Fout",
        description: "Kon contractvoorbeeld niet genereren",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendDigital = async () => {
    if (!vehicle.customerContact?.email) {
      toast({
        title: "Geen klant email",
        description: "Voeg eerst een klant email toe aan dit voertuig",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create signature session
      const session = await createSignatureSession(vehicle, contractType, options);
      const signatureUrl = generateSignatureUrl(session);
      
      // Generate contract with signature URL
      const contract = await generateContract(vehicle, contractType, options, signatureUrl);
      
      // Simulate sending email with contract and signature link
      console.log("Digitaal contract verzonden naar:", vehicle.customerContact.email);
      console.log("Ondertekeningslink:", signatureUrl);
      
      toast({
        title: "Contract verzonden",
        description: `Digitaal contract met ondertekeningslink verzonden naar ${vehicle.customerContact.email}`,
      });
      
      onClose();
    } catch (error) {
      console.error("Error sending digital contract:", error);
      toast({
        title: "Fout",
        description: "Kon digitaal contract niet verzenden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = () => {
    onSendContract(options);
    onClose();
  };

  const handleAddTradeIn = () => {
    setShowTradeInForm(true);
  };

  const handleRemoveTradeIn = () => {
    setOptions(prev => {
      const { tradeInVehicle, ...rest } = prev;
      return rest;
    });
    setShowTradeInForm(false);
  };

  const handleTradeInChange = (field: string, value: string | number) => {
    setOptions(prev => ({
      ...prev,
      tradeInVehicle: {
        ...prev.tradeInVehicle,
        brand: prev.tradeInVehicle?.brand || "",
        model: prev.tradeInVehicle?.model || "",
        mileage: prev.tradeInVehicle?.mileage || 0,
        licenseNumber: prev.tradeInVehicle?.licenseNumber || "",
        tradeInPrice: prev.tradeInVehicle?.tradeInPrice || 0,
        [field]: value
      }
    }));
  };

  const isB2B = contractType === "b2b";

  if (showPreview && contractPreview) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Contract Voorbeeld
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)} className="ml-auto">
                Terug naar configuratie
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div 
              className="border rounded-lg p-4 bg-white max-h-[60vh] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: contractPreview.htmlContent }}
            />
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Bewerken
              </Button>
              <Button onClick={deliveryMethod === "digital" ? handleSendDigital : handleSendEmail}>
                {deliveryMethod === "digital" ? (
                  <>
                    <PenTool className="h-4 w-4 mr-2" />
                    Voor Digitale Ondertekening Versturen
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Per Email Versturen
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Koopcontract Configuratie - {isB2B ? "Zakelijke klant" : "Particuliere klant"}
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vehicle Info */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Voertuig informatie</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Voertuig:</span> {vehicle.brand} {vehicle.model}
              </div>
              <div>
                <span className="font-medium">Kleur:</span> {vehicle.color || "Niet opgegeven"}
              </div>
              <div>
                <span className="font-medium">Kenteken:</span> {vehicle.licenseNumber}
              </div>
              <div>
                <span className="font-medium">Kilometerstand:</span> {vehicle.mileage?.toLocaleString()} km
              </div>
              <div>
                <span className="font-medium">VIN:</span> {vehicle.vin}
              </div>
              <div>
                <span className="font-medium">Verkoopprijs:</span> €{vehicle.sellingPrice?.toLocaleString() || "0"}
              </div>
            </div>
          </div>

          {/* Delivery Method Selection */}
          <div className="space-y-4">
            <h4 className="font-medium">Verzendmethode</h4>
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  deliveryMethod === "digital" 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setDeliveryMethod("digital")}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <PenTool className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Digitale Ondertekening</span>
                </div>
                <p className="text-sm text-gray-600">
                  Klant kan contract digitaal ondertekenen via een veilige link
                </p>
              </div>
              
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  deliveryMethod === "email" 
                    ? "border-green-500 bg-green-50" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setDeliveryMethod("email")}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Mail className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Email Bijlage</span>
                </div>
                <p className="text-sm text-gray-600">
                  Contract als PDF bijlage in email
                </p>
              </div>
            </div>
          </div>

          {/* B2B Specific Options */}
          {isB2B && (
            <div className="space-y-4">
              <h4 className="font-medium">Zakelijke klant opties</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>BTW behandeling</Label>
                  <Select 
                    value={options.btwType} 
                    onValueChange={(value: "inclusive" | "exclusive") => 
                      setOptions(prev => ({ ...prev, btwType: value }))
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
                  <Label>Voertuig type</Label>
                  <Select 
                    value={options.vehicleType} 
                    onValueChange={(value: "marge" | "btw") => 
                      setOptions(prev => ({ ...prev, vehicleType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="btw">BTW voertuig</SelectItem>
                      <SelectItem value="marge">Marge voertuig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="bpm-included"
                  checked={options.bpmIncluded}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, bpmIncluded: checked as boolean }))
                  }
                />
                <Label htmlFor="bmp-included">BPM inbegrepen in prijs</Label>
              </div>

              <div>
                <Label>Maximaal schade bedrag (€)</Label>
                <Input
                  type="number"
                  value={options.maxDamageAmount}
                  onChange={(e) => 
                    setOptions(prev => ({ ...prev, maxDamageAmount: parseInt(e.target.value) || 0 }))
                  }
                  placeholder="500"
                />
              </div>
            </div>
          )}

          {/* B2C Specific Options */}
          {!isB2B && (
            <div className="space-y-4">
              <h4 className="font-medium">Particuliere klant opties</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Afleverpakket</Label>
                  <Select 
                    value={options.deliveryPackage} 
                    onValueChange={(value) => 
                      setOptions(prev => ({ ...prev, deliveryPackage: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="garantie_wettelijk">Garantie wettelijk</SelectItem>
                      <SelectItem value="6_maanden_autocity">6 Maanden Autocity garantie</SelectItem>
                      <SelectItem value="12_maanden_autocity">12 Maanden Autocity garantie</SelectItem>
                      <SelectItem value="12_maanden_bovag">12 Maanden Bovag garantie</SelectItem>
                      <SelectItem value="12_maanden_bovag_vervangend">12 Maanden Bovag garantie (inclusief vervangend vervoer)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Betalingsvoorwaarden</Label>
                  <Select 
                    value={options.paymentTerms} 
                    onValueChange={(value) => 
                      setOptions(prev => ({ ...prev, paymentTerms: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aanbetaling_5">Aanbetaling 5%</SelectItem>
                      <SelectItem value="aanbetaling_10">Aanbetaling 10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Trade-in Vehicle Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">Inruil voertuig</h5>
                  {!options.tradeInVehicle && !showTradeInForm ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddTradeIn}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Inruil voertuig toevoegen
                    </Button>
                  ) : null}
                </div>

                {(showTradeInForm || options.tradeInVehicle) && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        <span className="font-medium">Inruil voertuig details</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleRemoveTradeIn}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Merk</Label>
                        <Input
                          value={options.tradeInVehicle?.brand || ""}
                          onChange={(e) => handleTradeInChange("brand", e.target.value)}
                          placeholder="Bijv. Volkswagen"
                        />
                      </div>
                      <div>
                        <Label>Model</Label>
                        <Input
                          value={options.tradeInVehicle?.model || ""}
                          onChange={(e) => handleTradeInChange("model", e.target.value)}
                          placeholder="Bijv. Golf"
                        />
                      </div>
                      <div>
                        <Label>Kenteken</Label>
                        <Input
                          value={options.tradeInVehicle?.licenseNumber || ""}
                          onChange={(e) => handleTradeInChange("licenseNumber", e.target.value)}
                          placeholder="Bijv. 12-ABC-3"
                        />
                      </div>
                      <div>
                        <Label>Kilometerstand</Label>
                        <Input
                          type="number"
                          value={options.tradeInVehicle?.mileage || ""}
                          onChange={(e) => handleTradeInChange("mileage", parseInt(e.target.value) || 0)}
                          placeholder="120000"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Inruilprijs (€)</Label>
                        <Input
                          type="number"
                          value={options.tradeInVehicle?.tradeInPrice || ""}
                          onChange={(e) => handleTradeInChange("tradeInPrice", parseInt(e.target.value) || 0)}
                          placeholder="5000"
                        />
                      </div>
                    </div>

                    {options.tradeInVehicle?.brand && options.tradeInVehicle?.tradeInPrice > 0 && (
                      <div className="bg-muted p-3 rounded">
                        <p className="text-sm">
                          <strong>Inruil:</strong> {options.tradeInVehicle.brand} {options.tradeInVehicle.model} - 
                          €{options.tradeInVehicle.tradeInPrice.toLocaleString('nl-NL')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Additional Options */}
          <div className="space-y-4">
            <h4 className="font-medium">Extra afspraken</h4>
            
            <div>
              <Label>Aanvullende contractclausules</Label>
              <Textarea
                value={options.additionalClauses}
                onChange={(e) => 
                  setOptions(prev => ({ ...prev, additionalClauses: e.target.value }))
                }
                placeholder="Voeg extra clausules toe die specifiek voor dit contract gelden..."
                className="min-h-[80px]"
              />
            </div>

            <div>
              <Label>Speciale afspraken</Label>
              <Textarea
                value={options.specialAgreements}
                onChange={(e) => 
                  setOptions(prev => ({ ...prev, specialAgreements: e.target.value }))
                }
                placeholder="Bijzondere afspraken tussen verkoper en koper..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button variant="outline" onClick={handlePreview} disabled={loading}>
              <Eye className="h-4 w-4 mr-2" />
              Voorbeeld
            </Button>
            <Button onClick={deliveryMethod === "digital" ? handleSendDigital : handleSendEmail} disabled={loading}>
              {loading ? "Bezig..." : (
                deliveryMethod === "digital" ? (
                  <>
                    <PenTool className="h-4 w-4 mr-2" />
                    Voor Ondertekening Versturen
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Contract Versturen
                  </>
                )
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
