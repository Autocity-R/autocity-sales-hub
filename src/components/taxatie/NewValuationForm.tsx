import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Car, Loader2, AlertCircle, Calculator } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BRANDS = ["Audi", "BMW", "Mercedes-Benz", "Volkswagen", "Volvo", "Porsche", "Land Rover", "Jaguar", "Tesla", "Overig"];
const FUEL_TYPES = ["Benzine", "Diesel", "Elektrisch", "Hybride", "Plug-in Hybride"];
const TRANSMISSIONS = ["Automaat", "Handgeschakeld"];
const TRIMS = ["Basis", "Comfort", "Business", "Luxury", "Sport", "S-Line", "M Sport", "AMG", "R-Line", "Inscription"];

const COMMON_OPTIONS = [
  "Panoramadak",
  "Leder interieur",
  "Trekhaak",
  "LED koplampen",
  "Stoelverwarming",
  "Navigatie",
  "Achteruitrijcamera",
  "Elektrische achterklep",
  "Keyless entry",
  "Adaptive cruise control",
  "Lane assist",
  "360° camera",
  "Head-up display",
  "Harman Kardon audio",
  "Bose audio",
  "Sportonderstel",
  "Luchtvering",
  "Digitaal dashboard",
];

export function NewValuationForm() {
  const [licensePlate, setLicensePlate] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customOptions, setCustomOptions] = useState("");
  
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    buildYear: "",
    mileage: "",
    fuelType: "",
    transmission: "",
    power: "",
    trim: "",
  });

  const handleLicensePlateSearch = async () => {
    if (!licensePlate) return;
    setIsSearching(true);
    // TODO: Implement RDW/JP Cars lookup
    setTimeout(() => {
      setIsSearching(false);
    }, 1000);
  };

  const toggleOption = (option: string) => {
    setSelectedOptions(prev => 
      prev.includes(option) 
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement JP Cars API call and AI analysis
    console.log("Submitting valuation:", { formData, selectedOptions, customOptions });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left side - Input form */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Voertuiggegevens
            </CardTitle>
            <CardDescription>
              Voer kenteken in voor automatische gegevens of vul handmatig in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* License plate search */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="licensePlate">Kenteken</Label>
                <div className="flex gap-2">
                  <Input
                    id="licensePlate"
                    placeholder="XX-123-XX"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    className="uppercase"
                  />
                  <Button 
                    type="button" 
                    onClick={handleLicensePlateSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="brand">Merk</Label>
                <Select value={formData.brand} onValueChange={(v) => setFormData({...formData, brand: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer merk" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANDS.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="bijv. A4, 3 Serie, C-Klasse"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="buildYear">Bouwjaar</Label>
                <Input
                  id="buildYear"
                  type="number"
                  placeholder="2020"
                  value={formData.buildYear}
                  onChange={(e) => setFormData({...formData, buildYear: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="mileage">Kilometerstand</Label>
                <Input
                  id="mileage"
                  type="number"
                  placeholder="50000"
                  value={formData.mileage}
                  onChange={(e) => setFormData({...formData, mileage: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fuelType">Brandstof</Label>
                <Select value={formData.fuelType} onValueChange={(v) => setFormData({...formData, fuelType: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer brandstof" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map(fuel => (
                      <SelectItem key={fuel} value={fuel}>{fuel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="transmission">Transmissie</Label>
                <Select value={formData.transmission} onValueChange={(v) => setFormData({...formData, transmission: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer transmissie" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSMISSIONS.map(trans => (
                      <SelectItem key={trans} value={trans}>{trans}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="power">Vermogen (PK)</Label>
                <Input
                  id="power"
                  type="number"
                  placeholder="150"
                  value={formData.power}
                  onChange={(e) => setFormData({...formData, power: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="trim">Uitvoering</Label>
                <Select value={formData.trim} onValueChange={(v) => setFormData({...formData, trim: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer uitvoering" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIMS.map(trim => (
                      <SelectItem key={trim} value={trim}>{trim}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opties & Accessoires</CardTitle>
            <CardDescription>
              Selecteer aanwezige opties voor een nauwkeurigere taxatie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {COMMON_OPTIONS.map(option => (
                <Badge
                  key={option}
                  variant={selectedOptions.includes(option) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => toggleOption(option)}
                >
                  {option}
                </Badge>
              ))}
            </div>
            <div>
              <Label htmlFor="customOptions">Overige opties</Label>
              <Textarea
                id="customOptions"
                placeholder="Voer hier overige opties in, gescheiden door komma's"
                value={customOptions}
                onChange={(e) => setCustomOptions(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSubmit} className="w-full" size="lg">
          <Calculator className="mr-2 h-4 w-4" />
          Start Taxatie
        </Button>
      </div>

      {/* Right side - Results */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Taxatie Resultaat</CardTitle>
            <CardDescription>
              Voer eerst voertuiggegevens in om een taxatie te starten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                JP Cars API is nog niet geconfigureerd. Vraag de API key aan bij JP Cars om taxaties uit te voeren.
              </AlertDescription>
            </Alert>

            {/* Placeholder for results */}
            <div className="mt-6 space-y-4 text-muted-foreground">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm">JP Cars Basiswaarde</p>
                  <p className="text-2xl font-bold text-foreground">—</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm">Optie Meerwaarde</p>
                  <p className="text-2xl font-bold text-foreground">—</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm">Geschatte Marktwaarde</p>
                  <p className="text-2xl font-bold text-foreground">—</p>
                </div>
                <div className="rounded-lg border p-4 bg-primary/5">
                  <p className="text-sm">Max. Inkoopprijs (20% marge)</p>
                  <p className="text-2xl font-bold text-primary">—</p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm mb-2">Courantheid</p>
                <div className="h-2 bg-muted rounded-full">
                  <div className="h-2 bg-muted-foreground/20 rounded-full w-0" />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium mb-2">AI Advies</p>
                <p className="text-sm">Wachtend op voertuiggegevens...</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interne Vergelijking</CardTitle>
            <CardDescription>
              Vergelijking met eigen verkoop historie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-muted-foreground text-sm">
              <div className="flex justify-between">
                <span>Gem. marge voor dit type:</span>
                <span className="font-medium">—</span>
              </div>
              <div className="flex justify-between">
                <span>Gem. statijd:</span>
                <span className="font-medium">— dagen</span>
              </div>
              <div className="flex justify-between">
                <span>Verkocht afgelopen jaar:</span>
                <span className="font-medium">— stuks</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
