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
  
  return <div className="min-h-screen w-full overflow-hidden lg:grid lg:grid-cols-[240px_1fr] xl:grid-cols-[280px_1fr]">
      {/* Desktop Sidebar - sticky within grid */}
      <aside className="hidden lg:block sticky top-0 h-screen overflow-y-auto bg-black">
        <Sidebar className="w-full" />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && <>
          <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-[240px] lg:hidden">
            <Sidebar />
          </div>
        </>}

      {/* Main content column */}
      <div className="flex flex-col w-full min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white shadow-sm px-4">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
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
        <main className="flex-1 w-full overflow-x-visible">
          <div className="max-w-[2000px] mx-auto px-4 py-4 lg:px-6 lg:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>;
};
export default DashboardLayout;