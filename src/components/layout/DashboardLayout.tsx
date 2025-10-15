
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
    <div className="grid min-h-screen bg-gray-50 lg:grid-cols-[16rem,1fr]">
      {/* Desktop Sidebar - sticky, claims column */}
      <div className="hidden lg:block lg:sticky lg:top-0 lg:h-screen lg:z-40">
        <Sidebar />
      </div>

      {/* Main content column */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm lg:px-4">
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
        
        {/* Page content */}
        <main className="flex-1 py-4 px-4 lg:px-6">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar - overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-[60] w-64 lg:hidden">
            <Sidebar />
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardLayout;
