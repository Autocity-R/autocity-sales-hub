
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Inventory from "./pages/Inventory";
import Transport from "./pages/Transport";
import NotFound from "./pages/NotFound";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import InventoryB2B from "./pages/InventoryB2B";
import InventoryB2C from "./pages/InventoryB2C";
import InventoryDelivered from "./pages/InventoryDelivered";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/inventory/online" element={<Inventory />} />
          <Route path="/inventory/b2b" element={<InventoryB2B />} />
          <Route path="/inventory/consumer" element={<InventoryB2C />} />
          <Route path="/inventory/delivered" element={<InventoryDelivered />} />
          <Route path="/transport" element={<Transport />} />
          <Route path="/leads" element={<Index />} />
          
          {/* Customer management routes */}
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/b2b" element={<Customers />} />
          <Route path="/customers/b2c" element={<Customers />} />
          <Route path="/suppliers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          
          <Route path="/reports" element={<Index />} />
          <Route path="/warranty" element={<Index />} />
          <Route path="/calendar" element={<Index />} />
          <Route path="/settings" element={<Index />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
