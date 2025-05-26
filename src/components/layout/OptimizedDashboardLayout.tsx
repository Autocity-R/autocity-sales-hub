
import React, { memo, Suspense } from "react";
import Header from "./Header";
import { Sidebar } from "./Sidebar";
import { Skeleton } from "@/components/ui/skeleton";

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
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
          <Suspense fallback={<LoadingFallback />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
});

OptimizedDashboardLayout.displayName = "OptimizedDashboardLayout";
LoadingFallback.displayName = "LoadingFallback";

export default OptimizedDashboardLayout;
