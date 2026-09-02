
import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import { Toaster } from "@/components/ui/toaster";
import { DigitalSignaturePage } from "@/components/contracts/DigitalSignaturePage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import "./App.css";

// Lazy load pages for better performance
const Index = lazyWithRetry(() => import("@/pages/Index"));
const Transport = lazyWithRetry(() => import("@/pages/Transport"));
const Inventory = lazyWithRetry(() => import("@/pages/Inventory"));
const InventoryB2B = lazyWithRetry(() => import("@/pages/InventoryB2B"));
const InventoryB2C = lazyWithRetry(() => import("@/pages/InventoryB2C"));
const InventoryDelivered = lazyWithRetry(() => import("@/pages/InventoryDelivered"));
const InventoryOnline = lazyWithRetry(() => import("@/pages/InventoryOnline"));
const LoanCars = lazyWithRetry(() => import("@/pages/LoanCars"));
const AIAgents = lazyWithRetry(() => import("@/pages/AIAgents"));
const Leads = lazyWithRetry(() => import("@/pages/Leads"));
const Calendar = lazyWithRetry(() => import("@/pages/Calendar"));
const TaskManagement = lazyWithRetry(() => import("@/pages/TaskManagement"));
const Customers = lazyWithRetry(() => import("@/pages/Customers"));
const CustomerDetail = lazyWithRetry(() => import("@/pages/CustomerDetail"));
const Reports = lazyWithRetry(() => import("@/pages/Reports"));
const Warranty = lazyWithRetry(() => import("@/pages/Warranty"));
const GarantieInbox = lazyWithRetry(() => import("@/pages/garantie/GarantieInbox"));
const Taxatie = lazyWithRetry(() => import("@/pages/Taxatie"));
const FotoStudio = lazyWithRetry(() => import("@/pages/FotoStudio"));
const Settings = lazyWithRetry(() => import("@/pages/Settings"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));
const TestContract = lazyWithRetry(() => import("@/pages/TestContract"));
const ContractPreview = lazyWithRetry(() => import("@/pages/ContractPreview"));
const ChecklistView = lazyWithRetry(() => import("@/pages/ChecklistView"));
const ContractNew = lazyWithRetry(() => import("@/pages/ContractNew"));
const SigningPage = lazyWithRetry(() => import("@/pages/SigningPage"));

// Werkplaats module
const WerkplaatsDashboard = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsDashboard"));
const WerkplaatsAutos = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsAutos"));
const WerkplaatsPlanning = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsPlanning"));
const WerkplaatsInname = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsInname"));
const WerkplaatsInnameDetail = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsInnameDetail"));
const WerkplaatsSchadeherstel = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsSchadeherstel"));
const WerkplaatsUitdeuken = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsUitdeuken"));
const WerkplaatsGoedkeuren = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsGoedkeuren"));
const WerkplaatsOnderdelen = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsOnderdelen"));
const WerkplaatsPoetsen = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsPoetsen"));
const WerkplaatsFacturen = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsFacturen"));
const WerkplaatsKlanten = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsKlanten"));
const WerkplaatsFactuurNieuw = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsFactuurNieuw"));
const WerkplaatsPrijslijst = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsPrijslijst"));
const WerkplaatsAgenda = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsAgenda"));
const MijnPlanning = lazyWithRetry(() => import("@/pages/werkplaats/MijnPlanning"));
const MijnWerk = lazyWithRetry(() => import("@/pages/werkplaats/MijnWerk"));
const UitdeukHome = lazyWithRetry(() => import("@/pages/werkplaats/UitdeukHome"));
const WerkplaatsOverzicht = lazyWithRetry(() => import("@/pages/werkplaats/WerkplaatsOverzicht"));
const OperationeelHome = lazyWithRetry(() => import("@/pages/werkplaats/OperationeelHome"));
const DirectieDashboard = lazyWithRetry(() => import("@/pages/directie/DirectieDashboard"));

// Rapportages
const RapportageOmzet = lazyWithRetry(() => import("@/pages/rapportages/RapportageOmzet"));
const RapportagePerformance = lazyWithRetry(() => import("@/pages/rapportages/RapportagePerformance"));
const RapportageKpi = lazyWithRetry(() => import("@/pages/rapportages/RapportageKpi"));
const RapportageDoorlooptijden = lazyWithRetry(() => import("@/pages/rapportages/RapportageDoorlooptijden"));
const RapportagePoetsen = lazyWithRetry(() => import("@/pages/rapportages/RapportagePoetsen"));

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
          <Route path="/teken/:token" element={<SigningPage />} />
          <Route path="/checklist/view/:token" element={<ChecklistView />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } />
        <Route path="/transport" element={
          <ProtectedRoute>
            <RoleProtectedRoute requiredAccess="transport">
              <Transport />
            </RoleProtectedRoute>
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
        {/* Geen losse landingspagina: /rapportages linkt door naar Omzet */}
        <Route path="/rapportages" element={<Navigate to="/rapportages/omzet" replace />} />
        <Route path="/rapportages/omzet" element={
          <ProtectedRoute>
            <RoleProtectedRoute requiredAccess="rapportages" fallbackPath="/">
              <RapportageOmzet />
            </RoleProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/rapportages/performance" element={
          <ProtectedRoute>
            <RoleProtectedRoute requiredAccess="rapportages" fallbackPath="/">
              <RapportagePerformance />
            </RoleProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/rapportages/kpi" element={
          <ProtectedRoute>
            <RoleProtectedRoute requiredAccess="rapportages" fallbackPath="/">
              <RapportageKpi />
            </RoleProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/rapportages/doorlooptijden" element={
          <ProtectedRoute>
            <RoleProtectedRoute requiredAccess="rapportages" fallbackPath="/">
              <RapportageDoorlooptijden />
            </RoleProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/rapportages/poetsen" element={
          <ProtectedRoute>
            <RoleProtectedRoute requiredAccess="poets-rapportage" fallbackPath="/">
              <RapportagePoetsen />
            </RoleProtectedRoute>
          </ProtectedRoute>
        } />
        <Route path="/garantie/inbox" element={
          <ProtectedRoute>
            <GarantieInbox />
          </ProtectedRoute>
        } />
        {/* TODO: Tijdelijk geen rol-check - later terugzetten met RoleProtectedRoute */}
        <Route path="/taxatie" element={
          <ProtectedRoute>
            <Taxatie />
          </ProtectedRoute>
        } />
        <Route path="/foto-studio" element={
          <ProtectedRoute>
            <FotoStudio />
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
        <Route path="/contracten/nieuw" element={
          <ProtectedRoute>
            <ContractNew />
          </ProtectedRoute>
        } />
        {/* Werkplaats module (aftersales) */}
        <Route path="/werkplaats" element={<ProtectedRoute><WerkplaatsDashboard /></ProtectedRoute>} />
        <Route path="/werkplaats/autos" element={<ProtectedRoute><WerkplaatsAutos /></ProtectedRoute>} />
        <Route path="/werkplaats/planning" element={<ProtectedRoute><WerkplaatsPlanning /></ProtectedRoute>} />
        <Route path="/werkplaats/inname" element={<ProtectedRoute><WerkplaatsInname /></ProtectedRoute>} />
        <Route path="/werkplaats/inname/:id" element={<ProtectedRoute><WerkplaatsInnameDetail /></ProtectedRoute>} />
        <Route path="/werkplaats/schadeherstel" element={<ProtectedRoute><WerkplaatsSchadeherstel /></ProtectedRoute>} />
        <Route path="/werkplaats/uitdeuken" element={<ProtectedRoute><WerkplaatsUitdeuken /></ProtectedRoute>} />
        <Route path="/werkplaats/goedkeuren" element={<ProtectedRoute><WerkplaatsGoedkeuren /></ProtectedRoute>} />
        <Route path="/werkplaats/onderdelen" element={<ProtectedRoute><WerkplaatsOnderdelen /></ProtectedRoute>} />
        <Route path="/werkplaats/poetsen" element={<ProtectedRoute><WerkplaatsPoetsen /></ProtectedRoute>} />
        <Route path="/werkplaats/facturen" element={<ProtectedRoute><WerkplaatsFacturen /></ProtectedRoute>} />
        <Route path="/werkplaats/klanten" element={<ProtectedRoute><WerkplaatsKlanten /></ProtectedRoute>} />
        <Route path="/werkplaats/facturen/nieuw" element={<ProtectedRoute><WerkplaatsFactuurNieuw /></ProtectedRoute>} />
        <Route path="/werkplaats/prijslijst" element={<ProtectedRoute><WerkplaatsPrijslijst /></ProtectedRoute>} />
        <Route path="/werkplaats/agenda" element={<ProtectedRoute><WerkplaatsAgenda /></ProtectedRoute>} />
        {/* Role-specifieke placeholder-startpagina's */}
        <Route path="/werkplaats/mijn-werk" element={<ProtectedRoute><MijnWerk /></ProtectedRoute>} />
        <Route path="/werkplaats/mijn-planning" element={<ProtectedRoute><MijnPlanning /></ProtectedRoute>} />
        <Route path="/uitdeuk" element={<ProtectedRoute><UitdeukHome /></ProtectedRoute>} />
        <Route path="/werkplaats/overzicht" element={<ProtectedRoute><WerkplaatsOverzicht /></ProtectedRoute>} />
        <Route path="/operationeel" element={<ProtectedRoute><OperationeelHome /></ProtectedRoute>} />
        <Route path="/directie" element={<ProtectedRoute><DirectieDashboard /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster />
    </>
  );
}

export default App;
