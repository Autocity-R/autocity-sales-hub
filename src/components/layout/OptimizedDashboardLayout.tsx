
import React, { memo, Suspense } from "react";
import Header from "./Header";
import { Sidebar } from "./Sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Loading fallback component
const LoadingFallback = memo(() => (
  <div className="p-4 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
));

const OptimizedDashboardLayout = memo<DashboardLayoutProps>(({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        <ResizablePanel defaultSize={18} minSize={14} maxSize={26} className="hidden lg:block min-w-[14rem] max-w-[26rem]">
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle withHandle className="hidden lg:flex" />
        <ResizablePanel defaultSize={82}>
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto py-4 bg-gray-50 dark:bg-gray-900">
              <Suspense fallback={<LoadingFallback />}>
                {children}
              </Suspense>
            </main>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
});

OptimizedDashboardLayout.displayName = "OptimizedDashboardLayout";
LoadingFallback.displayName = "LoadingFallback";

export default OptimizedDashboardLayout;
