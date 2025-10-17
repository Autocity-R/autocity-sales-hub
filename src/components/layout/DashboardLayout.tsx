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
const DashboardLayout = ({
  children
}: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isInventory = location.pathname.startsWith("/inventory");
  return <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && <>
          <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
            <Sidebar />
          </div>
        </>}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex h-12 md:h-16 shrink-0 items-center gap-x-2 md:gap-x-4 border-b border-gray-200 bg-white shadow-sm px-3 md:px-4 lg:px-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden h-9 w-9 p-0 touch-manipulation" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          
          <div className="flex flex-1 gap-x-2 md:gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-2 md:gap-x-4 lg:gap-x-6">
              <AuthHeader />
            </div>
          </div>
        </div>
        
        {/* Page content */}
        <main className="flex-1 py-3 px-3 md:py-6 md:px-4 lg:px-6">
          {children}
        </main>
      </div>
    </div>;
};
export default DashboardLayout;