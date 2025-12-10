import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OptimizedDashboardLayout from "@/components/layout/OptimizedDashboardLayout";
import { Calculator, History, FileSpreadsheet } from "lucide-react";
import { NewValuationForm } from "@/components/taxatie/NewValuationForm";
import { ValuationHistory } from "@/components/taxatie/ValuationHistory";
import { BulkTaxatieTab } from "@/components/taxatie/bulk/BulkTaxatieTab";

const Taxatie = () => {
  const [activeTab, setActiveTab] = useState("new");

  return (
    <OptimizedDashboardLayout>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="new" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calculator className="h-4 w-4" />
              Nieuwe Taxatie
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              Bulk Import
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="h-4 w-4" />
              Taxatie Historie
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4">
            <NewValuationForm />
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <BulkTaxatieTab />
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
