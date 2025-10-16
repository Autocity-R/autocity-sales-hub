import { cn } from "@/lib/utils";

interface AdaptiveGridProps {
  children: React.ReactNode;
  type?: "default" | "cards" | "dashboard" | "table" | "wide";
  className?: string;
}

export const AdaptiveGrid = ({ 
  children, 
  type = "default",
  className = ""
}: AdaptiveGridProps) => {
  const gridClasses = {
    default: "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6",
    cards: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4",
    dashboard: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
    table: "w-full overflow-hidden",
    wide: "grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8"
  };

  return (
    <div className={cn(gridClasses[type], className)}>
      {children}
    </div>
  );
};
