import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OptimizedDashboardLayout from "@/components/layout/OptimizedDashboardLayout";
import { Calculator, History } from "lucide-react";
import { NewValuationForm } from "@/components/taxatie/NewValuationForm";
import { ValuationHistory } from "@/components/taxatie/ValuationHistory";

const Taxatie = () => {
  const [activeTab, setActiveTab] = useState("new");

  return (
    <OptimizedDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Taxatie</h1>
          <p className="text-muted-foreground">
            Voertuig taxatie met JP Cars en AI-analyse
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="new" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Nieuwe Taxatie
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Taxatie Historie
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4">
            <NewValuationForm />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <ValuationHistory />
          </TabsContent>
        </Tabs>
      </div>
    </OptimizedDashboardLayout>
  );
};

export default Taxatie;
