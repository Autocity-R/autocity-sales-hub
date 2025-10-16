import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { AuthHeader } from "./AuthHeader";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({
  children
}: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
            <Sidebar />
          </div>
        </>
      )}

      {/* Desktop Layout with Resizable Panels */}
      <div className="hidden lg:flex w-full h-screen">
        <ResizablePanelGroup direction="horizontal">
          {/* Resizable Sidebar Panel */}
          <ResizablePanel
            defaultSize={18}
            minSize={15}
            maxSize={25}
            className="min-w-[240px]"
          >
            <Sidebar className="h-full" />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Main Content Panel */}
          <ResizablePanel defaultSize={82}>
            <div className="flex flex-col h-full">
              {/* Top bar */}
              <div className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-x-4 border-b bg-card shadow-sm px-4">
                <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                  <div className="flex flex-1"></div>
                  <div className="flex items-center gap-x-4 lg:gap-x-6">
                    <AuthHeader />
                  </div>
                </div>
              </div>
              
              {/* Page content - Full Width */}
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile Layout */}
      <div className="flex lg:hidden flex-col w-full">
        {/* Mobile Top bar */}
        <div className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-x-4 border-b bg-card shadow-sm px-4">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-6 w-6" />
          </Button>
          
          <div className="flex flex-1 gap-x-4 self-stretch">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4">
              <AuthHeader />
            </div>
          </div>
        </div>
        
        {/* Mobile Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;