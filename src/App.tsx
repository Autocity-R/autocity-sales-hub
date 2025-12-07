
import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import { Toaster } from "@/components/ui/toaster";
import { DigitalSignaturePage } from "@/components/contracts/DigitalSignaturePage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import "./App.css";

// Lazy load pages for better performance
const Index = lazy(() => import("@/pages/Index"));
const Transport = lazy(() => import("@/pages/Transport"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const InventoryB2B = lazy(() => import("@/pages/InventoryB2B"));
const InventoryB2C = lazy(() => import("@/pages/InventoryB2C"));
const InventoryDelivered = lazy(() => import("@/pages/InventoryDelivered"));
const InventoryOnline = lazy(() => import("@/pages/InventoryOnline"));
const LoanCars = lazy(() => import("@/pages/LoanCars"));
const AIAgents = lazy(() => import("@/pages/AIAgents"));
const Leads = lazy(() => import("@/pages/Leads"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const TaskManagement = lazy(() => import("@/pages/TaskManagement"));
const Customers = lazy(() => import("@/pages/Customers"));
const CustomerDetail = lazy(() => import("@/pages/CustomerDetail"));
const Reports = lazy(() => import("@/pages/Reports"));
const Warranty = lazy(() => import("@/pages/Warranty"));
const Taxatie = lazy(() => import("@/pages/Taxatie"));
const Settings = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const TestContract = lazy(() => import("@/pages/TestContract"));
const ContractPreview = lazy(() => import("@/pages/ContractPreview"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="space-y-4 w-full max-w-md p-4">
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

function App() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
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
            <RoleProtectedRoute requiredAccess="ai-agents" fallbackPath="/">
              <AIAgents />
            </RoleProtectedRoute>
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
            <RoleProtectedRoute requiredAccess="reports" fallbackPath="/">
              <Reports />
            </RoleProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/warranty" element={
          <ProtectedRoute>
            <Warranty />
          </ProtectedRoute>
        } />
        <Route path="/taxatie" element={
          <ProtectedRoute>
            <RoleProtectedRoute requiredAccess="taxatie" fallbackPath="/">
              <Taxatie />
            </RoleProtectedRoute>
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
      </Suspense>
      <Toaster />
    </>
  );
}

export default App;
