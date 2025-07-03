
import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Transport from "@/pages/Transport";
import Inventory from "@/pages/Inventory";
import InventoryB2B from "@/pages/InventoryB2B";
import InventoryB2C from "@/pages/InventoryB2C";
import InventoryDelivered from "@/pages/InventoryDelivered";
import InventoryOnline from "@/pages/InventoryOnline";
import LoanCars from "@/pages/LoanCars";
import AIAgents from "@/pages/AIAgents";
import Leads from "@/pages/Leads";
import Calendar from "@/pages/Calendar";
import TaskManagement from "@/pages/TaskManagement";
import Customers from "@/pages/Customers";
import CustomerDetail from "@/pages/CustomerDetail";
import Reports from "@/pages/Reports";
import Warranty from "@/pages/Warranty";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import TestContract from "@/pages/TestContract";
import ContractPreview from "@/pages/ContractPreview";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import { Toaster } from "@/components/ui/toaster";
import { DigitalSignaturePage } from "@/components/contracts/DigitalSignaturePage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import "./App.css";

function App() {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/contract/sign/:token" element={<DigitalSignaturePage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        } />
        <Route path="/transport" element={
          <ProtectedRoute>
            <Transport />
          </ProtectedRoute>
        } />
        <Route path="/inventory" element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        } />
        <Route path="/inventory/b2b" element={
          <ProtectedRoute>
            <InventoryB2B />
          </ProtectedRoute>
        } />
        <Route path="/inventory/b2c" element={
          <ProtectedRoute>
            <InventoryB2C />
          </ProtectedRoute>
        } />
        <Route path="/inventory/consumer" element={
          <ProtectedRoute>
            <InventoryB2C />
          </ProtectedRoute>
        } />
        <Route path="/inventory/delivered" element={
          <ProtectedRoute>
            <InventoryDelivered />
          </ProtectedRoute>
        } />
        <Route path="/inventory/online" element={
          <ProtectedRoute>
            <InventoryOnline />
          </ProtectedRoute>
        } />
        <Route path="/loan-cars" element={
          <ProtectedRoute>
            <LoanCars />
          </ProtectedRoute>
        } />
        <Route path="/ai-agents" element={
          <ProtectedRoute>
            <AIAgents />
          </ProtectedRoute>
        } />
        <Route path="/leads" element={
          <ProtectedRoute>
            <Leads />
          </ProtectedRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        } />
        <Route path="/tasks" element={
          <ProtectedRoute>
            <TaskManagement />
          </ProtectedRoute>
        } />
        <Route path="/customers" element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        } />
        <Route path="/customers/b2b" element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        } />
        <Route path="/customers/b2c" element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        } />
        <Route path="/suppliers" element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        } />
        <Route path="/customers/:id" element={
          <ProtectedRoute>
            <CustomerDetail />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="/warranty" element={
          <ProtectedRoute>
            <Warranty />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute requireAdmin={true}>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/test-contract" element={
          <ProtectedRoute>
            <TestContract />
          </ProtectedRoute>
        } />
        <Route path="/contract-preview" element={
          <ProtectedRoute>
            <ContractPreview />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
