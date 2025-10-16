import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, FileText, Pen, AlertCircle } from "lucide-react";
import { getSignatureSession, signContract, validateSignatureSession } from "@/services/digitalSignatureService";
import { generateContract } from "@/services/contractService";
import { fetchVehicle } from "@/services/inventoryService";
import { Vehicle } from "@/types/inventory";
import DOMPurify from 'dompurify';

export const DigitalSignaturePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [session, setSession] = useState<any>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  
  useEffect(() => {
    loadSignatureSession();
  }, [token]);

  const loadSignatureSession = async () => {
    if (!token) {
      toast({
        title: "Fout",
        description: "Ongeldige ondertekeningslink",
        variant: "destructive"
      });
      navigate("/");
      return;
    }

    try {
      const signatureSession = getSignatureSession(token);
      
      if (!signatureSession) {
        toast({
          title: "Sessie niet gevonden",
          description: "Deze ondertekeningslink is ongeldig of verlopen",
          variant: "destructive"
        });
        return;
      }

      const validation = validateSignatureSession(signatureSession);
      if (!validation.isValid) {
        toast({
          title: "Sessie niet geldig",
          description: validation.error,
          variant: "destructive"
        });
        return;
      }

      setSession(signatureSession);
      
      // Load vehicle data
      const vehicleData = await fetchVehicle(signatureSession.vehicleId);
      setVehicle(vehicleData);
      
      // Generate contract for display
      const contractData = await generateContract(
        vehicleData,
        signatureSession.contractType,
        signatureSession.contractOptions
      );
      setContract(contractData);
      
      // Pre-fill signer email if available
      if (vehicleData.customerContact?.email) {
        setSignerEmail(vehicleData.customerContact.email);
      }
      if (vehicleData.customerContact?.name) {
        setSignerName(vehicleData.customerContact.name);
      }
      
    } catch (error) {
      console.error("Error loading signature session:", error);
      toast({
        title: "Fout",
        description: "Kon ondertekeningssessie niet laden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    if (!signerName.trim() || !signerEmail.trim()) {
      toast({
        title: "Vereiste velden",
        description: "Vul uw naam en email adres in",
        variant: "destructive"
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if signature is drawn
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasSignature = imageData.data.some((channel, index) => 
      index % 4 === 3 && channel !== 0 // Check alpha channel
    );
    
    if (!hasSignature) {
      toast({
        title: "Handtekening vereist",
        description: "Plaats uw handtekening in het vak",
        variant: "destructive"
      });
      return;
    }

    setSigning(true);
    
    try {
      const signatureData = canvas.toDataURL();
      const signerIP = "127.0.0.1"; // In productie zou dit de echte IP zijn
      
      const success = await signContract(
        token!,
        signerName,
        signerEmail,
        signatureData,
        signerIP
      );
      
      if (success) {
        setSigned(true);
        toast({
          title: "Contract ondertekend",
          description: "Uw handtekening is succesvol opgeslagen",
        });
      } else {
        toast({
          title: "Fout",
          description: "Kon contract niet ondertekenen",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error signing contract:", error);
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het ondertekenen",
        variant: "destructive"
      });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Contract laden...</p>
        </div>
      </div>
    );
  }

  if (!session || !vehicle || !contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Contract niet gevonden</h2>
            <p className="text-gray-600">Deze ondertekeningslink is ongeldig of verlopen.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Contract Ondertekend</h2>
            <p className="text-gray-600 mb-4">
              Bedankt voor het ondertekenen van het contract. U ontvangt binnen enkele minuten 
              een bevestiging per email.
            </p>
            <div className="text-sm text-gray-500">
              <p>Ondertekend door: {signerName}</p>
              <p>Email: {signerEmail}</p>
              <p>Tijd: {new Date().toLocaleString('nl-NL')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Digitaal Contract Ondertekenen</h1>
          <p className="text-gray-600">
            {vehicle.brand} {vehicle.model} - {vehicle.licenseNumber}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contract Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contract Voorbeeld
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="border rounded-lg p-4 max-h-96 overflow-y-auto bg-white"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(contract.htmlContent, {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'div', 'span'],
                      ALLOWED_ATTR: ['class', 'style']
                    })
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Signature Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pen className="h-5 w-5" />
                  Ondertekening
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="signer-name">Volledige naam</Label>
                  <Input
                    id="signer-name"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Uw volledige naam"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="signer-email">Email adres</Label>
                  <Input
                    id="signer-email"
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="uw@email.nl"
                    required
                  />
                </div>

                <div>
                  <Label>Handtekening</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={150}
                      className="w-full h-32 border border-gray-200 rounded cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                    <div className="flex justify-between mt-2">
                      <p className="text-sm text-gray-600">Teken uw handtekening hierboven</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSignature}
                      >
                        Wissen
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Belangrijk:</strong> Door dit contract te ondertekenen bevestigt u dat u 
                    akkoord gaat met alle voorwaarden zoals vermeld in het contract. Deze handtekening 
                    heeft dezelfde juridische waarde als een handgeschreven handtekening.
                  </p>
                </div>

                <Button
                  onClick={handleSign}
                  disabled={signing}
                  className="w-full"
                  size="lg"
                >
                  {signing ? "Bezig met ondertekenen..." : "Contract Ondertekenen"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
