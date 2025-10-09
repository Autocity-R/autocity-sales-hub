
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { AuthHeader } from "./AuthHeader";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
            <Sidebar />
          </div>
        </>
      )}

      {/* Desktop layout with resizable sidebar */}
      <div className="hidden lg:flex w-full">
        <ResizablePanelGroup direction="horizontal" className="w-full">
          <ResizablePanel defaultSize={18} minSize={14} maxSize={26} className="min-w-[14rem] max-w-[26rem]">
            <Sidebar />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={82}>
            <div className="flex flex-1 flex-col">
              {/* Top bar */}
              <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b bg-white px-4 shadow-sm">
                <div className="flex flex-1"></div>
                <div className="flex items-center gap-x-4">
                  <AuthHeader />
                </div>
              </div>
              {/* Page content */}
              <main className="flex-1 py-4">
                {children}
              </main>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile content */}
      <div className="flex flex-1 flex-col lg:hidden">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b bg-white px-4 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex flex-1" />
          <div className="flex items-center gap-x-4">
            <AuthHeader />
          </div>
        </div>
        {/* Page content */}
        <main className="flex-1 py-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
