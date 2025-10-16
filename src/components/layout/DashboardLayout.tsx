import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { AuthHeader } from "./AuthHeader";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - Scaled for better readability */}
      <div className="hidden lg:flex lg:w-72 xl:w-80 2xl:w-96 lg:flex-col sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
            <Sidebar />
          </div>
        </>
      )}

      {/* Main content - Full width with proper margin for sidebar */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex h-16 xl:h-20 shrink-0 items-center gap-x-4 border-b bg-card shadow-sm px-4 lg:px-6 xl:px-8 2xl:px-12">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <AuthHeader />
            </div>
          </div>
        </div>
        
        {/* Page content - Full width fluid for inventory */}
        <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 lg:py-6">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;