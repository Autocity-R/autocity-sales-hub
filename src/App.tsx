
import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Transport from "@/pages/Transport";
import Inventory from "@/pages/Inventory";
import InventoryB2B from "@/pages/InventoryB2B";
import InventoryB2C from "@/pages/InventoryB2C";
import InventoryDelivered from "@/pages/InventoryDelivered";
import InventoryOnline from "@/pages/InventoryOnline";
import LoanCars from "@/pages/LoanCars";
import Leads from "@/pages/Leads";
import Calendar from "@/pages/Calendar";
import Customers from "@/pages/Customers";
import CustomerDetail from "@/pages/CustomerDetail";
import Reports from "@/pages/Reports";
import Warranty from "@/pages/Warranty";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import { DigitalSignaturePage } from "@/components/contracts/DigitalSignaturePage";
import "./App.css";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/transport" element={<Transport />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/inventory/b2b" element={<InventoryB2B />} />
        <Route path="/inventory/b2c" element={<InventoryB2C />} />
        <Route path="/inventory/delivered" element={<InventoryDelivered />} />
        <Route path="/inventory/online" element={<InventoryOnline />} />
        <Route path="/loan-cars" element={<LoanCars />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/warranty" element={<Warranty />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/contract/sign/:token" element={<DigitalSignaturePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
