import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { AuthHeader } from "./AuthHeader";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar - Fixed width responsive */}
      <aside className="hidden lg:block lg:w-[240px] xl:w-[260px] 2xl:w-[280px] lg:sticky lg:top-0 lg:h-screen lg:shrink-0 border-r border-sidebar-border">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
            onClick={() => setSidebarOpen(false)} 
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[240px] lg:hidden">
            <Sidebar />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 w-full">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 flex h-14 lg:h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card shadow-sm px-4 lg:px-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex flex-1 items-center justify-end gap-x-4">
            <AuthHeader />
          </div>
        </header>
        
        {/* Page Content - Full width with max constraint */}
        <main className="flex-1 w-full overflow-hidden">
          <div className="h-full w-full max-w-[2000px] mx-auto px-4 py-4 lg:px-6 lg:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;